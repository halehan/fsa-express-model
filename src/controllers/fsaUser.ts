import { Response, Request, NextFunction } from "express";

import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as moment from "moment";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
const log4js = require("log4js");

const logger = log4js.getLogger();
logger.level = process.env.LOGGINGLEVEL

let _api: Api = new Api();
const swormCfg: any = require("sworm");

const SALT_WORK_FACTOR: number = 10;

function sessionValid(token: string): boolean {
  return token.toUpperCase() === "SUCCESS" ? true : false;
}

export let getHomeContentByName: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (sessionValid(validToken)) {

    const sworm: any = require("sworm");
    let db: any = sworm.db(Constants.configSworm);

    try {
      await db.query("select * from FsaCppAppContent where contentName = @content", { content: req.params.contentName })
        .then((results: any) => {
          res.send(results);
        });
    } catch (Error) {
      logger.error("Error " + Error);

    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getUsers: any = (req: Request, res: Response) => {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,x-access-token");

  var validToken = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from FsaUser").then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getUser = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  // var validToken = 'success';

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from FsaUser where loginId = @id", { id: req.params.loginId }).then(function (err, results) {
      if (err) {
        db.close();
        res.send(err);
      }
      //    logger.debug(results);
      db.close();
      res.send(results);
    });

  }

}

export let getRoles = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);


  db.query("Select U.*, R.* from FsaUser U, FsaRole R, FsaUserRoleAssoc A where " +
    " U.id = A.userId and R.id = A.roleId and U.loginId  =  @userLogin ",
    { userLogin: req.params.userLogin }).then(function (results) {
      db.close();
      res.send(results);
    });

}

export let authenticate = (req: Request, res: Response) => {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,x-access-token");

  logger.debug("In the authenticate method");

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  db.query("select U.* from FsaUser U where  U.loginId  = @id",
    { id: req.body.loginId }).then(function (results) {

      //    logger.debug(results);

      let authTime = new Date();
      logger.debug('Authenticate User ' + req.body.loginId + '  time:' + authTime );

      if (results.length == 0) {
        // this.putActivity(this.loginId, 'Authentication failed. User not found.');
        res.json({ success: false, message: "Authentication failed. User not found." });

      } else {
        var pass = results[0].password;
        logger.debug("found user");
        //   logger.debug(req.body.password);
        //   logger.debug(bcrypt.compareSync(req.body.password, pass)); // true
        // check if password matches
        if (!bcrypt.compareSync(req.body.password, pass)) {
          logger.debug("Authentication failed. Wrong password.");
          //  this.putActivity(this.loginId, 'Authentication failed. Wrong password.');
          res.json({ success: false, message: "Authentication failed. Wrong password." });

        } else {
          logger.debug("Logging in user " + req.body.loginId);
          //    this.putActivity(this.loginId, 'Success');

          // if user is found and password is right
          // create a token with only our given payload
          // we don't want to pass in the entire user since that has the password
          const payload = {
            //        admin: user.admin 
          };
          var token = jwt.sign(payload, Constants.credentials.superSecret, {
            expiresIn: 60 * 90 * 8 // expires in 2 or more hours
          });

          // return the information including token as JSON
          res.json({
            success: true,
            message: "Enjoy your token!",
            token: token
          });

        }

      }
      db.close();
    });  // end db.query()

  //  db.close();


};


export const postUser: any = async (req: Request, res: Response) => {

  let hashrtn = null;
  let rtnval: string;

  try {

    const hash = bcrypt.hashSync(req.body.password, SALT_WORK_FACTOR);
    logger.debug(hash)

        let db: any = swormCfg.db(Constants.configSworm);

        let fsaUser: any = db.model({ table: "FsaUser" });
      
        let rtnId: number;
      
      
        try {
          await db.connect(function () {
            let transaction: any = fsaUser({
              loginId: req.body.loginId,
              password: hash,
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              createdDate: moment().toDate()
            });
          return transaction.save().then(function () {
              rtnId = transaction.id;
              logger.debug(rtnId)
            });
          }).then(function () {
            logger.debug("After Insert id = " + rtnId);
            res.json({ id: rtnId });
          }).catch(err => res.json({ error: err })       ) 
        } catch (error) {
          res.json({ error: error });
          logger.error(error);
        } finally {
          logger.debug('closing DB')
          db.close();
        }


  } catch (e) {
    logger.error(e);
  }

  logger.debug('at the end')


};

export let putUser = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);
  let db;
  let roles =  new Map();
  let roleId;

  try {

  if (validToken == "success") {

    const sworm = require("sworm");
    db = sworm.db(Constants.configSworm);

    await db.query("select id, roleName from FsaRole").then(function (results) {
      results.forEach(role => {
        roles.set(role.roleName, role.id);
         });
    });

    roleId = roles.get('User');

    const fsaUser = db.model({ table: "FsaUser" });
    const fsaUserRoleAssoc = db.model({ table: "FsaUserRoleAssoc" });
    let user = fsaUser({
      firstName: req.body.firstName, lastName: req.body.lastName,
      phone: req.body.phone, updatedDate: moment().toDate(),
      id: req.body.id
    })
    await user.update();

    await db.query("delete from FsaUserRoleAssoc where userId = @id", { id: req.body.id }).then(function (results) {
    });

    if (req.body.user) {
      roleId = roles.get('User');
      let roleAssocUser = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
    await roleAssocUser.save();
    }

    if (req.body.admin) {
      roleId = roles.get('Admin');
      let roleAssocAdmin = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
    await roleAssocAdmin.save();
    }

    if (req.body.userAdmin) {
      roleId = roles.get('UserAdmin');
      let roleAssocSuper = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
     await roleAssocSuper.save();
    }

    if (req.body.audit) {
      roleId = roles.get('Audit');
      let roleAssocAudit = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
     await roleAssocAudit.save();
    }

    if (req.body.readOnly) {
      roleId = roles.get('ReadOnly');
      let roleAssocAudit = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
     await roleAssocAudit.save();
    }

    if (req.body.fine) {
      roleId = roles.get('Fine');
      let roleAssocAudit = fsaUserRoleAssoc({
        userId: req.body.id, roleId: roleId, createdDate: moment().toDate(),
      })
     await roleAssocAudit.save();
    }

    res.send(user);
  } else {
    res.json({ message: "Invalid Token" });
  }

} catch (e) {
  logger.error(e);
} finally {db.close();}
  
}

export let deleteUser = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("delete from FsaUser where Id = @id", { id: req.params.id }).then(function (results) {
      db.close();
      res.json({ message: "User deleted " + req.params.id });
    });

  }

}