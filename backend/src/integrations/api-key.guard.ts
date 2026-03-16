import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private normalize(value: unknown) {
    if (!value) return '';
    return String(value).trim().replace(/^['"]|['"]$/g, '');
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const rawHeader = req.headers['x-api-key'];
    const apiKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const expected =
      this.normalize(process.env.INTEGRATION_API_KEY) ||
      this.normalize(process.env.CRM_INTEGRATION_API_KEY);

    if (!expected) {
      throw new UnauthorizedException('Integracao nao configurada');
    }

    const provided = this.normalize(apiKey);
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Chave invalida');
    }

    return true;
  }
}
