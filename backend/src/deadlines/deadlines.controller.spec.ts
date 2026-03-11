import { Test, TestingModule } from '@nestjs/testing';
import { DeadlinesController } from './deadlines.controller';

describe('DeadlinesController', () => {
  let controller: DeadlinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeadlinesController],
    }).compile();

    controller = module.get<DeadlinesController>(DeadlinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
