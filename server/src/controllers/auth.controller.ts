import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthType } from 'src/constants';
import {
  AuthDto,
  ChangePasswordDto,
  ImmichCookie,
  LoginCredentialDto,
  LoginResponseDto,
  LogoutResponseDto,
  SignUpDto,
  ValidateAccessTokenResponseDto,
} from 'src/dtos/auth.dto';
import { UserResponseDto, mapUser } from 'src/dtos/user.dto';
import { Auth, Authenticated, GetLoginDetails, PublicRoute } from 'src/middleware/auth.guard';
import { AuthService, LoginDetails } from 'src/services/auth.service';
import { UserService } from 'src/services/user.service';
import { respondWithCookie, respondWithoutCookie } from 'src/utils/response';

@ApiTags('Authentication')
@Controller('auth')
@Authenticated()
export class AuthController {
  constructor(
    private service: AuthService,
    private userService: UserService,
  ) {}

  @PublicRoute()
  @Post('login')
  async login(
    @Body() loginCredential: LoginCredentialDto,
    @Res({ passthrough: true }) res: Response,
    @GetLoginDetails() loginDetails: LoginDetails,
  ): Promise<LoginResponseDto> {
    const body = await this.service.login(loginCredential, loginDetails);
    return respondWithCookie(res, body, {
      isSecure: loginDetails.isSecure,
      values: [
        { key: ImmichCookie.ACCESS_TOKEN, value: body.accessToken },
        { key: ImmichCookie.AUTH_TYPE, value: AuthType.PASSWORD },
        { key: ImmichCookie.IS_AUTHENTICATED, value: 'true' },
      ],
    });
  }

  @PublicRoute()
  @Post('admin-sign-up')
  signUpAdmin(@Body() dto: SignUpDto): Promise<UserResponseDto> {
    return this.service.adminSignUp(dto);
  }

  @Post('validateToken')
  @HttpCode(HttpStatus.OK)
  validateAccessToken(): ValidateAccessTokenResponseDto {
    return { authStatus: true };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Auth() auth: AuthDto, @Body() dto: ChangePasswordDto): Promise<UserResponseDto> {
    return this.service.changePassword(auth, dto).then(mapUser);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
    @Auth() auth: AuthDto,
  ): Promise<LogoutResponseDto> {
    const authType = (request.cookies || {})[ImmichCookie.AUTH_TYPE];

    const body = await this.service.logout(auth, authType);
    return respondWithoutCookie(res, body, [
      ImmichCookie.ACCESS_TOKEN,
      ImmichCookie.AUTH_TYPE,
      ImmichCookie.IS_AUTHENTICATED,
    ]);
  }

  @Get('user')
  getMyUserInfo(@Auth() auth: AuthDto): Promise<UserResponseDto> {
    return this.userService.getMe(auth);
  }
}
