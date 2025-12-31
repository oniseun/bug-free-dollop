import { ApiProperty } from '@nestjs/swagger';

export class ResponseFormat<T = void> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation Successful' })
  message: string;

  @ApiProperty({
    required: false,
    description: 'Response data (if applicable)',
  })
  data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
  }
}
