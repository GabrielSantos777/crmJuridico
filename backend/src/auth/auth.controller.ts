import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OfficesService } from '../offices/offices.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private officesService: OfficesService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'LAWYER')
  register(@Body() body: RegisterDto, @Request() req) {
    return this.authService.register(body, req.user.officeId);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login({
      identifier: body.identifier,
      email: body.email,
      cpf: body.cpf,
      password: body.password,
    });
  }

  @Post('select-office')
  selectOffice(@Body() body: { selectionToken: string; officeId: string }) {
    return this.authService.selectOffice(body.selectionToken, body.officeId);
  }

  @Post('force-change')
  forceChange(@Body() body: { changeToken: string; newPassword: string }) {
    return this.authService.forceChangePassword(body.changeToken, body.newPassword);
  }

  @Get('office-lock')
  async officeLock() {
    const officeId = (process.env.OFFICE_LOCK_ID ?? '').trim();
    if (!officeId) {
      return { locked: false };
    }
    const office = await this.officesService.findById(officeId);
    return {
      locked: true,
      office: office ? { id: office.id, name: office.name } : null,
    };
  }

  @Post('admin/login')
  adminLogin(@Body() body: LoginDto) {
    return this.authService.adminLogin(body.email ?? '', body.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Request() req) {
    return req.user;
  }
}
