import { Response, Request, NextFunction } from "express";

import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as moment from "moment";
import { Constants } from "../utils/constants";

const log4js = require("log4js");

const logger = log4js.getLogger();

logger.level = process.env.LOGGINGLEVEL

export class Persistencehelper {

   getQuery: any =  async(sql: string): Promise<any> => {

    let db: any;
    let ret: Promise<any>;
    try {
        const sworm: any = require("sworm");
        db = sworm.db(Constants.configSworm);

        await db.query(sql).then((results: any) => {
          if (results) {
            ret =  results;
          }
        });
      } catch (error) {
        logger.error("Fetching transaction failed", error);
      } finally {
        db.close();
      }
}


}