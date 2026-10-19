import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CharacterStatus } from '../character-status.enum';

class CharacterFieldsDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  real_name!: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  alias!: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  main_power!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  power_level!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  team_id?: number | null;
}

export class CreateCharacterDto extends CharacterFieldsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(CharacterStatus)
  status?: CharacterStatus;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_villain?: boolean;
}

export class ReplaceCharacterDto extends CharacterFieldsDto {
  @IsEnum(CharacterStatus)
  status!: CharacterStatus;

  @IsBoolean()
  is_villain!: boolean;
}

export class UpdateCharacterStatusDto {
  @IsEnum(CharacterStatus)
  status!: CharacterStatus;
}

export class CharacterQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(CharacterStatus)
  status?: CharacterStatus;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId?: number;
}