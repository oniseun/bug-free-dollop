import { ApiProperty } from '@nestjs/swagger';

export class PageDto<T = unknown> {
  @ApiProperty({ isArray: true })
  public items: T[];

  @ApiProperty()
  public total: number;

  @ApiProperty()
  public limit: number;

  @ApiProperty()
  public offset: number;

  constructor(items: T[], total: number, limit: number, offset: number) {
    this.items = items;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
  }
}
