import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @ApiProperty({ example: 1, description: 'Identificador único del usuario' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'usuario@example.com',
    description: 'Correo electrónico del usuario',
  })
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @ApiProperty({
    type: String,
    example: 'Juan Pérez',
    nullable: true,
    required: false,
    description: 'Nombre del usuario',
  })
  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @ApiProperty({
    example: '2026-08-12T10:00:00.000Z',
    description: 'Fecha y hora de creación del usuario',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2026-08-12T10:00:00.000Z',
    description: 'Fecha y hora de la última actualización',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
