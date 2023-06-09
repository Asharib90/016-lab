import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GetUser, ResponseMessage } from '../common/decorator';
import { AuthService } from './auth.service';
import { loginDTO, registerDTO } from './dto';
import { responseEnum } from './enum';
import { JwtGuard, RefreshTokenGuard } from './guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage(responseEnum.REGISTER_SUCCESSFULLY)
  @ApiResponse({
    status: 200,
    description: responseEnum.REGISTER_SUCCESSFULLY,
  })
  @ApiResponse({
    status: 400,
    schema: {
      anyOf: [
        {
          title: 'EMAIL_ALREADY_EXIST',
          description: responseEnum.EMAIL_ALREADY_EXIST,
        },
        {
          title: 'USERNAME_ALREADY_EXIST',
          description: responseEnum.USERNAME_ALREADY_EXIST,
        },
      ],
    },
  })
  @HttpCode(200)
  async register(@Body() body: registerDTO): Promise<any> {
    return await this.authService.register(body);
  }

  @Post('login')
  @ResponseMessage(responseEnum.LOGIN_SUCCESSFULLY)
  @ApiResponse({
    status: 200,
    description: responseEnum.LOGIN_SUCCESSFULLY,
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: responseEnum.INVALID_CREDENTIAL,
  })
  @ApiBody({ type: loginDTO, description: 'The data for login' })
  @HttpCode(200)
  async login(
    @Res({ passthrough: true }) response: Response,
    @Body() payload: loginDTO,
  ): Promise<any> {
    return await this.authService.login(response, payload);
  }

  @UseGuards(JwtGuard)
  @UseGuards(RefreshTokenGuard)
  @ResponseMessage(responseEnum.TOKEN_REFRESH_SUCCESSFULLY)
  @ApiResponse({
    status: 200,
    description: responseEnum.TOKEN_REFRESH_SUCCESSFULLY,
  })
  @Get('refresh-token')
  @HttpCode(200)
  async tokenRefresh(
    @GetUser() userData: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    return await this.authService.tokenRefresh(userData, response);
  }

  @UseGuards(JwtGuard)
  @ApiCookieAuth()
  @Get('logout')
  @ResponseMessage(responseEnum.LOGOUT_SUCCESSFULLY)
  @ApiResponse({
    status: 200,
    description: responseEnum.LOGOUT_SUCCESSFULLY,
  })
  @ApiResponse({
    status: 401,
    description: responseEnum.SESSION_EXPIRED,
  })
  @HttpCode(200)
  async logout(
    @GetUser() userData: any,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    return await this.authService.logout(userData.email, request, response);
  }
}
