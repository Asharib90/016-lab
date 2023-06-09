import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class PostSchema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @ApiProperty({ description: 'title', example: 'NestJS' })
  title: string;

  @Column()
  @ApiProperty({ description: 'description', example: 'This is description' })
  description: string;

  @ApiProperty({ description: 'createdBy', example: 'asharib ahmed' })
  @Column()
  createdBy: string;

  @ApiPropertyOptional({
    description: 'image',
    example:
      'https://arctype.com/blog/content/images/size/w1750/2022/01/nest.png',
  })
  @Column({ nullable: true })
  image: string;
}
