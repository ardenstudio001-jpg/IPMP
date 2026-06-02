import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { NewListNameDto } from './new-list-name.dto';

export class MoveToAcquiredDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  sourceItemIds: string[];

  @ValidateIf((o: MoveToAcquiredDto) => !o.acquiredListId)
  @IsOptional()
  @ValidateNested()
  @Type(() => NewListNameDto)
  newAcquiredList?: NewListNameDto;

  @ValidateIf((o: MoveToAcquiredDto) => !o.newAcquiredList)
  @IsOptional()
  @IsUUID()
  acquiredListId?: string;
}
