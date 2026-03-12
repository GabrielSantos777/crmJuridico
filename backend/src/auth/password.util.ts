import { BadRequestException } from '@nestjs/common';

export function assertStrongPassword(password: string) {
  const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!strong.test(password)) {
    throw new BadRequestException('Senha fraca. Use 8+ caracteres, letra maiuscula, numero e caractere especial.');
  }
}
