import { Response, Request, NextFunction } from "express";

import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as moment from "moment";
import { Constants } from "../utils/constants";
import * as log4js from "log4js";

const logger = log4js.getLogger();

export class Api {

  authCheck = function (req: Request, resp: Response): any {
    return this.verify(req);
  };

  authCheckAsync = function async(req: Request, resp: Response): any {
    return this.verify(req);
  };

  private readonly verify: any = (req: Request): string => {

    const token: string = req.body.token || req.query.token || req.headers["x-access-token"] || req.headers.authorization;
    let rtn: string;

    jwt.verify(token, Constants.credentials.superSecret, (err, decoded) => {
      if (err) {
        rtn = "fail";
      } else {
        rtn = "success";
      }

    });

    return rtn;

  }


}