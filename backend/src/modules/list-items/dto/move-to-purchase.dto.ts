import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { NewListNameDto } from './new-list-name.dto';

export class MoveToPurchaseDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  sourceItemIds: string[];

  @ValidateIf((o: MoveToPurchaseDto) => !o.purchaseListId)
  @IsOptional()
  @ValidateNested()
  @Type(() => NewListNameDto)
  newPurchaseList?: NewListNameDto;

  @ValidateIf((o: MoveToPurchaseDto) => !o.newPurchaseList)
  @IsOptional()
  @IsUUID()
  purchaseListId?: string;
}
