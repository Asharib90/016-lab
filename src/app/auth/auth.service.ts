import { RoleEnum } from '../common/enum';
import {
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as moment from 'moment-timezone';
moment.tz.setDefault('Asia/Karachi');

import { Response, Request } from 'express';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from 'src/config/config.service';
import { IClientToken } from './interface';

import { loginDTO } from './dto';
import { Cache } from 'cache-manager';

import { Helper } from 'src/app/common/helper/utilities.helper';
import { responseEnum } from './enum';
import {
  Auth,
  AuthDocument,
  Client,
  ClientDocument,
} from '../modules/user/schema';
const helper = new Helper();
@Injectable()
export class AuthService {
  private logger = new Logger('AuthService');

  constructor(
    private readonly helper: Helper,
    private config: ConfigService,
    private jwt: JwtService,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectModel(Client.name, connectionEnum.ERP)
    private readonly clientModel: Model<ClientDocument>,


    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) { }

  async login(
    response: Response,
    payload: loginDTO,
  ): Promise<any> {
    this.logger.log('Hits 'ogin() Method');
    const { username, password } = payload;

    //filter results
    const auth = await this.authModel.findOne({
      empCode: username,
    });
    const employeeData = await this.employeeModel
      .findOne({
        empCode: username,
      })
      .populate([{ path: 'region', model: this.regionModel }]);

    //check if employee exists
    if (!employeeData)
      throw new ForbiddenException(responseEnum.INVALID_CREDENTIAL);

    const isMatched = await this.helper.comparePassword(password, auth.pin);

    if (!isMatched)
      throw new ForbiddenException(responseEnum.INVALID_CREDENTIAL);

    //get perfect date formats for log
    const momentLogDate = moment().utc().add(5, 'hours'),
      logDay = momentLogDate.format('DD'),
      logMonth = momentLogDate.format('MM'),
      logYear = momentLogDate.format('YYYY'),
      logTime = momentLogDate.format('hh:mm A'),
      logDate = momentLogDate.format('DD-MM-YYYY'),
      logMessage = {};

    //assign values to notification object
    logMessage['type'] = 'Login';
    logMessage['time'] = logTime;
    logMessage['empnotificatione'] = employeeData.name;
    logMessage['region'] = employeeData.region;
    logMessage['date'] = logDate;

    //generate jwt token for the employee
    const accessTokenPayload = {
      user: RoleEnum.EMPLOYEE,
      employeeCode: username,
      type: 'access',
    };

    const accessToken = await this.signToken(
      accessTokenPayload,
      this.config.get().tokenExpiresDurationInMinutesForEmployee + 'm',
      this.config.get().jwtSecret,
    );

    //generate refresh token for the employee
    const refreshTokenPayload = {
      user: RoleEnum.EMPLOYEE,
      employeeCode: username,
      type: 'refresh',
    };

    const refreshToken = await this.signToken(
      refreshTokenPayload,
      this.config.get().refreshExpiresDurationInYears + 'Y',
      this.config.get().refreshSecret,
    );

    // Add log to log collection
    // await Promise.all([
    //   this.notificationAndSupportModel.updateOne(
    //     { recordType: 'jwtTokens' },
    //     { $set: { [`jwtTokens.${username}.web`]: token.slice(-20) } },
    //     { upsert: true },
    //   ),
    //   this.notificationAndSupportModel.updateOne(
    //     { recordType: 'logs' },
    //     {
    //       $push: {
    //         [`webLogin.${logYear}.${logMonth}.${logDay}`]: logMessage,
    //       },
    //     },
    //     { upsert: true },
    //   ),
    // ]);

    this.logger.log(`Employee ${username} logged in successfully`);

    // response.cookie('api-auth', token, {
    //   secure: false,
    //   httpOnly: true,
    //   expires: new Date(
    //     Number(new Date()) + Number(expiresInMinutes) * 60 * 1000,
    //   ),
    //   signed: true,
    // });

    return {
      accessToken,
      refreshToken,
    };
    //remove above line and uncomment below line
    // return { accessToken: token };
  }

  async logout(
    empCode: string,
    request: Request,
    response: Response,
  ): Promise<any> {
    const authHeader = request.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];

    // get data from cache
    const cacheUserRecord = await this.cacheManager.get<{ name: string }>(
      empCode,
    );

    let cacheData: any;
    if (cacheUserRecord) {
      cacheData = JSON.parse(cacheUserRecord);
      cacheData[String(empCode)].push(authToken);
    } else {
      cacheData = {
        [empCode]: [authToken],
      };
    }
    // set cache data
    await this.cacheManager.set(empCode, JSON.stringify(cacheData), {
      ttl: this.config.get().cacheExpiresDurationInMinutes * 60,
    });

    //we are not using cookies for now
    // Clear cookie
    // response.clearCookie('api-auth');

    this.logger.log(`Employee ${empCode} logged out successfully`);

    return null;
  }

  async signToken(
    payload: IClientToken,
    expiresIn: string,
    secret: string,
  ): Promise<string> {
    const token = await this.jwt.signAsync(payload, {
      expiresIn: expiresIn,
      secret: secret,
      issuer: this.config.get().ecoSystemUrl,
    });

    return token;
  }

  async tokenRefresh(empCode: string): Promise<any> {
    this.logger.log('Hits tokenRefresh()');

    //generate jwt token for the employee
    const accessTokenPayload = {
      user: RoleEnum.EMPLOYEE,
      employeeCode: empCode,
      type: 'access',
    };

    const accessToken = await this.signToken(
      accessTokenPayload,
      this.config.get().tokenExpiresDurationInMinutesForEmployee + 'm',
      this.config.get().jwtSecret,
    );

    //generate refresh token for the employee
    const refreshTokenPayload = {
      user: RoleEnum.EMPLOYEE,
      employeeCode: empCode,
      type: 'refresh',
    };

    const refreshToken = await this.signToken(
      refreshTokenPayload,
      this.config.get().refreshExpiresDurationInYears + 'Y',
      this.config.get().refreshSecret,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateClientToken(
    token: string,
    payload: IClientToken,
  ): Promise<any> {
    this.logger.log('Hits validateClientToken()');

    return this.clientModel
      .findOne({ CNIC: payload.employeeCNIC })
      .then(async (clientData) => {
        if (!clientData) throw new UnauthorizedException('Invalid token');
        const redisUser = await this.cacheManager.get<{ name: string }>(
          payload.employeeCNIC,
        );
        if (redisUser) {
          let parsedUserData = JSON.parse(redisUser);
          parsedUserData = parsedUserData[payload.employeeCNIC];
          if (parsedUserData?.includes(token))
            throw new UnauthorizedException('Session expired');
        }
        return clientData;
      });
  }
}
