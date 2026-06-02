import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NewListNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
