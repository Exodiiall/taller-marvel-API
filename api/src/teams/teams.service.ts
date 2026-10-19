import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Team } from './team.entity';
import { Character } from '../characters/character.entity';
import {
  AssignCharactersDto,
  CreateTeamDto,
  ReplaceTeamDto,
} from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,

    @InjectRepository(Character)
    private readonly charactersRepository: Repository<Character>,

    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.teamsRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const team = await this.teamsRepository.findOneBy({ id });

    if (!team) {
      throw new NotFoundException(`No existe el equipo con id ${id}`);
    }

    return team;
  }

  async findCharacters(id: number) {
    await this.findOne(id);

    return this.charactersRepository.find({
      where: { team_id: id },
      order: { id: 'ASC' },
    });
  }

  create(dto: CreateTeamDto) {
    return this.runTransaction(async (manager) => {
      const team = manager.create(Team, {
        name: dto.name,
        base: dto.base ?? null,
        founded_year: dto.founded_year ?? null,
        active: dto.active ?? true,
      });

      const savedTeam = await manager.save(Team, team);

      if (dto.characterIds?.length) {
        await this.assignToTeam(
          manager,
          savedTeam,
          dto.characterIds,
        );
      }

      return savedTeam;
    });
  }

  replace(id: number, dto: ReplaceTeamDto) {
    return this.runTransaction(async (manager) => {
      const team = await this.getLockedTeam(manager, id);

      team.name = dto.name;
      team.base = dto.base ?? null;
      team.founded_year = dto.founded_year ?? null;
      team.active = dto.active;

      return manager.save(Team, team);
    });
  }

  assignCharacters(id: number, dto: AssignCharactersDto) {
    return this.runTransaction(async (manager) => {
      const team = await this.getLockedTeam(manager, id);

      await this.assignToTeam(manager, team, dto.characterIds);

      return manager.find(Character, {
        where: { team_id: id },
        order: { id: 'ASC' },
      });
    });
  }

  remove(id: number) {
    return this.runTransaction(async (manager) => {
      await this.getLockedTeam(manager, id);

      const totalCharacters = await manager.count(Character, {
        where: { team_id: id },
      });

      if (totalCharacters > 0) {
        throw new ConflictException(
          'No se puede eliminar un equipo con personajes asociados',
        );
      }

      await manager.delete(Team, id);

      return { message: 'Equipo eliminado correctamente' };
    });
  }

  private async getLockedTeam(
    manager: EntityManager,
    id: number,
  ): Promise<Team> {
    const team = await manager.findOne(Team, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!team) {
      throw new NotFoundException(`No existe el equipo con id ${id}`);
    }

    return team;
  }

  private async assignToTeam(
    manager: EntityManager,
    team: Team,
    characterIds: number[],
  ): Promise<void> {
    if (!team.active) {
      throw new BadRequestException(
        'No se pueden asignar personajes a un equipo inactivo',
      );
    }

    const ids = [...new Set(characterIds)];

    const characters = await manager
      .createQueryBuilder(Character, 'character')
      .where('character.id IN (:...ids)', { ids })
      .orderBy('character.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    if (characters.length !== ids.length) {
      throw new NotFoundException(
        'Uno o más personajes no existen',
      );
    }

    await manager.update(
      Character,
      { id: In(ids) },
      { team_id: team.id },
    );
  }

  private async runTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(work);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const { code } = error.driverError as { code?: string };

        if (code === '23505') {
          throw new ConflictException(
            'Ya existe un equipo con ese nombre',
          );
        }

        if (code === '23503') {
          throw new ConflictException(
            'La operación entra en conflicto con personajes asociados',
          );
        }

        if (
          code === '23514' ||
          code === '23502' ||
          code === '22001' ||
          code === '22P02'
        ) {
          throw new BadRequestException(
            'Los datos no cumplen las restricciones de la base de datos',
          );
        }
      }

      throw error;
    }
  }
}