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
  FindOptionsWhere,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Character } from './character.entity';
import { CharacterStatus } from './character-status.enum';
import { Team } from '../teams/team.entity';
import {
  CharacterQueryDto,
  CreateCharacterDto,
  ReplaceCharacterDto,
  UpdateCharacterStatusDto,
} from './dto/character.dto';

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private readonly charactersRepository: Repository<Character>,

    private readonly dataSource: DataSource,
  ) {}

  findAll(filters: CharacterQueryDto) {
    const where: FindOptionsWhere<Character> = {};

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    if (filters.teamId !== undefined) {
      where.team_id = filters.teamId;
    }

    return this.charactersRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const character = await this.charactersRepository.findOne({
      where: { id },
      relations: { team: true },
    });

    if (!character) {
      throw new NotFoundException(
        `No existe el personaje con id ${id}`,
      );
    }

    return character;
  }

  create(dto: CreateCharacterDto) {
    return this.runTransaction(async (manager) => {
      if (dto.team_id != null) {
        await this.validateTeam(manager, dto.team_id);
      }

      const character = manager.create(Character, {
        real_name: dto.real_name,
        alias: dto.alias,
        main_power: dto.main_power,
        power_level: dto.power_level,
        status: dto.status ?? CharacterStatus.ACTIVE,
        is_villain: dto.is_villain ?? false,
        team_id: dto.team_id ?? null,
      });

      return this.saveAndLoad(manager, character);
    });
  }

  replace(id: number, dto: ReplaceCharacterDto) {
    return this.runTransaction(async (manager) => {
      if (dto.team_id != null) {
        await this.validateTeam(manager, dto.team_id);
      }

      const character = await this.getLockedCharacter(manager, id);

      this.validateTransition(character.status, dto.status);

      character.real_name = dto.real_name;
      character.alias = dto.alias;
      character.main_power = dto.main_power;
      character.power_level = dto.power_level;
      character.status = dto.status;
      character.is_villain = dto.is_villain;
      character.team_id = dto.team_id ?? null;

      return this.saveAndLoad(manager, character);
    });
  }

  updateStatus(id: number, dto: UpdateCharacterStatusDto) {
    return this.runTransaction(async (manager) => {
      const character = await this.getLockedCharacter(manager, id);

      this.validateTransition(character.status, dto.status);

      character.status = dto.status;

      return this.saveAndLoad(manager, character);
    });
  }

  remove(id: number) {
    return this.runTransaction(async (manager) => {
      await this.getLockedCharacter(manager, id);

      await manager.delete(Character, id);

      return { message: 'Personaje eliminado correctamente' };
    });
  }

  private async validateTeam(
    manager: EntityManager,
    teamId: number,
  ): Promise<void> {
    const team = await manager.findOne(Team, {
      where: { id: teamId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!team) {
      throw new NotFoundException(
        `No existe el equipo con id ${teamId}`,
      );
    }

    if (!team.active) {
      throw new BadRequestException(
        'El personaje debe pertenecer a un equipo activo',
      );
    }
  }

  private validateTransition(
    current: CharacterStatus,
    next: CharacterStatus,
  ): void {
    if (
      current === CharacterStatus.RETIRED &&
      next === CharacterStatus.INJURED
    ) {
      throw new BadRequestException(
        'Un personaje RETIRED no puede pasar directamente a INJURED',
      );
    }
  }

  private async getLockedCharacter(
    manager: EntityManager,
    id: number,
  ): Promise<Character> {
    const character = await manager.findOne(Character, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!character) {
      throw new NotFoundException(
        `No existe el personaje con id ${id}`,
      );
    }

    return character;
  }

  private async saveAndLoad(
    manager: EntityManager,
    character: Character,
  ): Promise<Character> {
    const saved = await manager.save(Character, character);

    return manager.findOneOrFail(Character, {
      where: { id: saved.id },
      relations: { team: true },
    });
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
            'Ya existe un personaje con ese alias',
          );
        }

        if (code === '23503') {
          throw new NotFoundException(
            'El equipo asociado no existe',
          );
        }

        if (
          code === '23514' ||
          code === '23502' ||
          code === '22001' ||
          code === '22003' ||
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