import { Controller, Get, Param } from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get(':apiKey')
  getMeta(@Param('apiKey') apiKey: string) {
    return this.deliveryService.getMeta(apiKey);
  }

  @Get(':apiKey/:languageCode')
  getTranslations(
    @Param('apiKey') apiKey: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.deliveryService.getTranslations(apiKey, languageCode);
  }

  @Get(':apiKey/:languageCode/:fileGroupName')
  getTranslationsByGroup(
    @Param('apiKey') apiKey: string,
    @Param('languageCode') languageCode: string,
    @Param('fileGroupName') fileGroupName: string,
  ) {
    return this.deliveryService.getTranslations(apiKey, languageCode, fileGroupName);
  }
}
