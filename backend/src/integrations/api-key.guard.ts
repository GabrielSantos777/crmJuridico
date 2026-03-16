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

  private firstHeaderValue(value: unknown) {
    if (Array.isArray(value)) return value[0];
    return value;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const headerOfficeId = this.normalize(
      this.firstHeaderValue(req.headers['x-office-id']),
    );
    const queryOfficeId = this.normalize(req.query?.officeId);
    const bodyOfficeId = this.normalize(req.body?.officeId);
    const officeId = headerOfficeId || queryOfficeId || bodyOfficeId;

    if (!officeId) {
      throw new UnauthorizedException('officeId obrigatorio');
    }

    return true;
  }
}
