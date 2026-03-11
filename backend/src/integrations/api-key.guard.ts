import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'];
    const expected = process.env.INTEGRATION_API_KEY;

    if (!expected) {
      throw new UnauthorizedException('IntegraÃ§Ã£o nÃ£o configurada');
    }

    if (!apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Chave invÃ¡lida');
    }

    return true;
  }
}
