import { Test, TestingModule } from '@nestjs/testing';
import { DeadlinesService } from './deadlines.service';

describe('DeadlinesService', () => {
  let service: DeadlinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeadlinesService],
    }).compile();

    service = module.get<DeadlinesService>(DeadlinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
