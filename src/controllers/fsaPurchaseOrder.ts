import { Response, Request, NextFunction } from "express";

import * as moment from "moment";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
import * as log4js from "log4js";

const logger = log4js.getLogger();

logger.level = process.env.LOGGINGLEVEL

const _api: Api = new Api();
const swormCfg: any = require("sworm");

function sessionValid(token: string): boolean {
  return token.toUpperCase() === "SUCCESS" ? true : false;
}

export const getTransaction: any = async (req: Request, res: Response, next: NextFunction) => {
  const validToken: string = await _api.authCheckAsync(req, res);
  let db: any;

  if (sessionValid(validToken)) {
    try {
      db = swormCfg.db(Constants.configSworm);

      await db.query(
        `select * from FsaCppPurchaseOrder where id = @id and markAsDeleted = 0`,
        { id: req.params.transId }
      ).then((results: Object[]) => {
        if (results) {
          res.send(results);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
      });
    } catch (error) {
      logger.error("Fetching transaction failed", error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const verifyTransactionHasPayment: any = async (req: Request, res: Response, next: NextFunction) => {
  var validToken: string = await _api.authCheckAsync(req, res);

  if (sessionValid(validToken)) {

    let db: any;
    try {
      db = swormCfg.db(Constants.configSworm);

      await db.query(
        `Select id from FsaCppPurchaseOrder PO where id = @id and markAsDeleted = 0 and EXISTS 
         (Select fsaCppPurchaseOrderId from FsaCppPayment where fsaCppPurchaseOrderId = PO.id)`,
        { id: req.params.transId }
      ).then((results: Object[]) => {
        if (results) {
          res.send(results);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
      });
    } catch (error) {
      logger.error("Fetching transaction failed", error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};


export const getAdminFee: any = (req: Request, res: Response) => {

  const validToken: string = _api.authCheckAsync(req, res);
  let db: any;

  if (validToken === "success") {
    try {
      db = swormCfg.db(Constants.configSworm);
      db.query("select * from BidNumberType where bidNumber = @id", {
        id: req.params.bidNumber
      }).then((results: Object[]) => {
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
};

export const getTransactionByPoStatus: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  let db: any;

  if (validToken === "success") {

    let esc: string = req.params.poStatus;
    let bid: string = req.params.bidNumber;

    let sql: string = `Select * from FsaCppPurchaseOrder where markAsDeleted = '0'
      and poStatus = '${esc}'`
    if (bid !== "All") {
      sql = sql + ` and bidNumber =  '${bid}' order by createdTime desc`
    } else {
      sql = sql + ` order by createdTime desc `;
    }

    logger.debug(sql);

    db = swormCfg.db(Constants.configSworm);

    try {
      await db.query(sql).then((results: Object[]) => {
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
};

export const getTransactionByPoNumber: any = async (req: Request, res: Response) => {

  if (await _api.authCheckAsync(req, res) === "success") {

    let db: any = swormCfg.db(Constants.configSworm);
    let arg: string = null;

    try {
      arg = req.params.poNumber.replace("*", "%");
      arg = arg.replace("*", "%");
    } catch (error) {
      logger.error(error);
    }

    let initialQuery: string = `select PO.*, ISNULL(V.balance, PO.adminFeeDue ) as balance 
       from FsaCppPurchaseOrder PO LEFT OUTER JOIN  PurchaseOrderPaymentBalance V 
       on PO.id = V.id where  PO.markAsDeleted = '0' and PO.poNumber `;

    logger.debug(arg.substring(0, 1));
    if (arg.substring(0, 1) === "%" || arg.substr((arg.length - 1), 1) === "%") {
      initialQuery += ` LIKE '${arg.trim()}' `;

    } else {
      initialQuery += ` =  '${arg.trim()}' `;
    }

    initialQuery += ` order by createdTime desc`;

    logger.debug(initialQuery);

    try {

      await db.query(initialQuery).then((results: Object[]) => {
        res.send(results);
      });

    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const getTransactionByBidNumber: any = async (req: Request, res: Response) => {

  if (await _api.authCheckAsync(req, res) === "success") {
    console.time('getTransactionByBidNumber');
    let db: any = swormCfg.db(Constants.configSworm);
    console.timeEnd('getTransactionByBidNumber');

    let sql: string = `select PO.*, ISNULL(V.balance, PO.adminFeeDue ) as balance from FsaCppPurchaseOrder PO LEFT OUTER JOIN 
      PurchaseOrderPaymentBalance V on PO.id = V.id where PO.bidNUmber = @id and PO.markAsDeleted = '0'
      order by PO.createdTime desc`;
    logger.debug(sql);

    try {
      await db.query(sql,
        { id: req.params.bidNumber }
      ).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error("Error " + error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const searchTransactionsFilter: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  let sql: string =
    ` select PO.*, ISNULL(V.balance, PO.adminFeeDue ) as balance from FsaCppPurchaseOrder PO LEFT OUTER JOIN  PurchaseOrderPaymentBalance V 
     on PO.id = V.id where markAsDeleted = '0'`;

  logger.debug(sql);

  /*
  Will have bidNumber, status, PONUmber

  */

  if (validToken === "success") {
    let status: string = req.params.status;
    let bidNumber: string = req.params.bidNumber;

    if (bidNumber === undefined || bidNumber === "undefined" || bidNumber === null) {
      bidNumber = "ALL";
    }

    sql =
      "select * from FsaCppPurchaseOrder where markAsDeleted = 0 ";

    if ((status.toUpperCase() !== "ALL")) {
      sql += " and poStatus = " + status;
    }

    if ((bidNumber.toUpperCase() !== "ALL")) {
      sql += "and bidNUmber = " + "'" + bidNumber + "'";
    }

    let order: string = " order by createdTime desc";

    logger.debug(status);

    sql = sql + order;
    logger.debug(sql);

    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query(sql).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const getTransactionPaymentById: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query(`Select * from FsaCppPurchaseOrderCheckView V where V.id  = @id `, {
        id: req.params.id
      }).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const deletePaymentsByCheck: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query(
        `delete P from FsaCppPayment P, FsaCppPurchaseOrder PO where 
        PO.id =  P.fsaCppPurchaseOrderId and 
        P.paymentCheckNum = @checkNumber and PO.dealerName = @dealerName` , {
        checkNumber: req.params.checkNumber, dealerName: req.params.dealerName
      }).then((results: Object[]) => {
        res.json({
          message:
            "Payment deleted.  CheckNum: " +
            req.params.checkNumber +
            "  dealerName: " +
            req.params.dealerName
        });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const unLockPaymentsByCheck: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    let qry: string;

    qry = `delete from FsaCppCheckPaymentLock where paymentCheckNum = @checkNumber and dealerName = @dealerName`;

    try {
      await db.query(qry, {
        checkNumber: req.params.checkNumber,
        dealerName: req.params.dealerName
      }).then((results: Object[]) => {
        res.json({
          message: "Payments Unlocked.  CheckNum: " + req.params.checkNumber
        });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let getLockedPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    try {
      logger.debug("startDate " + req.params.startDate);
      logger.debug("endDate " + req.params.endDate);
      let authTime: Date = new Date();

      logger.debug("getLockedPaymentsByDate  " + authTime);

      const sql: string = `Select l.paymentCheckNum, L.dealerName, L.paymentDate, L.lockDate, P.paymentAmount,  
        PO.poNumber, po.adminFeeDue from FsaCppCheckPaymentLock L, FsaCppPurchaseOrder PO, FsaCppPayment P where 
        po.id = P.fsaCppPurchaseOrderId and L.fsaCppPaymentId = P.id and L.paymentDate BETWEEN @startDate and @endDate 
        order by L.paymentDate `;

      await db.query(
        sql, { startDate: req.params.startDate, endDate: req.params.endDate }
      ).then((results: Object[]) => {
        logger.debug(` rows = ${results.length} `)
        res.send(results);
      });
    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const unLockPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    try {
      logger.debug("startDate " + req.params.startDate);
      logger.debug("endDate " + req.params.endDate);
      let authTime: Date = new Date();
      logger.debug("unLockPayments  " + authTime);
      await db.query("unLockPayments @startDate, @endDate", { startDate: req.params.startDate, endDate: req.params.endDate })
        .then((results: Object[]) => {
          res.json({ mesresultssage: results });
        });
    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const lockPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);
    let authTime: Date = new Date();
      try {
        logger.debug("startDate " + req.params.startDate);
        logger.debug("endDate " + req.params.endDate);
        logger.debug("lockPayments  " + authTime);

       let results =  await db.query("refreshPaymentLock @startDate, @endDate, @createdBy", { startDate: req.params.startDate, endDate: req.params.endDate, createdBy: req.params.createdBy })
     //   .then((results:  Object[]) => {
      //    logger.debug(`  results ${results.length}`);
          res.json({ return: results });
    //    });

    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const getVerifyPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    try {
      logger.debug("startDate " + req.params.startDate);
      logger.debug("endDate " + req.params.endDate);
      let authTime: Date = new Date();

      logger.debug("getVerifyPaymentsByDate  " + authTime);

      const sql: string = ` Select V.paymentCheckNum, V.dealerName, V.paymentDate, V.verifiedDate, P.paymentAmount, PO.poNumber, po.adminFeeDue
         from FsaCppCheckVerified V, FsaCppPurchaseOrder PO, FsaCppPayment P where po.id = P.fsaCppPurchaseOrderId 
         and V.fsaCppPaymentId = P.id 
         and V.paymentDate BETWEEN @startDate and @endDate
         group by V.paymentCheckNum, V.dealerName, V.paymentDate, V.verifiedDate, P.paymentAmount, PO.poNumber, po.adminFeeDue 
         order by V.paymentDate `;

      await db.query(
        sql, { startDate: req.params.startDate, endDate: req.params.endDate }
      ).then((results: Object[]) => {
        res.send(results);
      });
    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const unVerifyPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    try {
      logger.debug("startDate " + req.params.startDate);
      logger.debug("endDate " + req.params.endDate);
      let authTime: Date = new Date();
      logger.debug("unVerifyPayments  " + authTime);
      await db.query("unVerifyPayments @startDate, @endDate", { startDate: req.params.startDate, endDate: req.params.endDate })
        .then((results: Object[]) => {
          res.json({ mesresultssage: results });
        });
    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const verifyPaymentsByDate: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);
  // let rtn: string = "";

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    try {
      logger.debug("startDate " + req.params.startDate);
      logger.debug("endDate " + req.params.endDate);
      let authTime: Date = new Date();
      logger.debug("verifyPayments  " + authTime);
      db.query("verifyPayments @startDate, @endDate", { startDate: req.params.startDate, endDate: req.params.endDate })
        .then((results: Object[]) => {
          logger.debug(results);
          res.json({ return: results });
        });
    } catch (e) {
      logger.error(e);
      res.json({ message: "Error processing.  error: " + e });
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const verifyPaymentsByCheckVendor: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    const qry: string =
      `INSERT INTO FsaCppCheckVerified ( fsaCppPaymentId, fsaCppItemId, fsaCppPurchaseorderId, paymentCheckNum,  
      paymentDate, dealerName, verifiedStatus, verifiedDate, createdBy, createdDate) 
      Select paymentId, itemId, poId, paymentCheckNum, " +
      paymentDate, @dealerName," +
      'V',
      SYSDATETIME(),
      'dwilliams@inspired-tech.net',
      SYSDATETIME() 
      from FsaCppPurchaseOrderCheckView2 where paymentCheckNum = @checkNumber and dealerName = @dealerName `;

    logger.debug(qry);

    try {
      await db.query(qry, {
        checkNumber: req.params.checkNumber,
        dealerName: req.params.dealerName
      }).then((results: Object[]) => {
        res.json({
          message:
            "Verified.  CheckNum: " +
            req.params.checkNumber +
            "  dealerName: " +
            req.params.dealerName
        });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const resetVerifyPaymentsByCheckVendor: any = async (req: Request, res: Response) => {


  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    let qry: string =
      " delete from FsaCppCheckVerified where paymentCheckNum = @checkNumber and dealerName = @dealerName ";

    logger.debug(qry);

    try {
      db.query(qry, {
        checkNumber: req.params.checkNumber,
        dealerName: req.params.dealerName
      }).then((results: Object[]) => {
        res.json({
          message:
            "Reset Verified.  CheckNum: " +
            req.params.checkNumber +
            "  dealerName: " +
            req.params.dealerName
        });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const lockPaymentsByCheck: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    const qry: string =
      "INSERT INTO FsaCppCheckPaymentLock ( fsaCppPaymentId, fsaCppItemId, fsaCppPurchaseorderId, paymentCheckNum,  " +
      " paymentDate, dealerName, lockStatus, lockDate, lockQtr, createdBy, comment, createdDate) " +
      " Select paymentId, itemId, poId, paymentCheckNum, " +
      " paymentDate, @dealerName ," +
      "'L'," +
      "SYSDATETIME() ," +
      "'3'," +
      "'dwilliams@inspired-tech.net'," +
      "'Testing'" +
      ", SYSDATETIME() " +
      "from FsaCppPurchaseOrderCheckView2 where paymentCheckNum = @checkNumber and dealerName = @dealerName ";

    logger.debug(qry);

    try {
      await db.query(qry, {
        checkNumber: req.params.checkNumber,
        dealerName: req.params.dealerName
      }).then((results: Object[]) => {
        res.json({
          message:
            "Payments Locked.  CheckNum: " +
            req.params.checkNumber +
            "  dealerName: " +
            req.params.dealerName
        });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const getTransactionPaymentDetailsByBidNumber: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query(
        "Select * from FsaCppPurchaseOrderCheckView2 V where V.paymentCheckNum  = @checkNumber " +
        "and  V.dealerName   =  @dealerName ",
        { checkNumber: req.params.checkNumber, dealerName: req.params.dealerName }
      ).then((results: Object[]) => {
        db.close();
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const getTransactionPaymentByCheckNumVendorPaymentDt: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  let query = `Select V.paymentCheckNum, V.dealerName, V.paymentDate,  Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, 
  V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon `

  let checkNum = req.params.checkNumber == 'ignore' ? 'ignore' : ' V.paymentCheckNum  LIKE ' + "'" + req.params.checkNumber.trim() + "%'"
  let vendor = req.params.vendor == 'ignore' ? 'ignore' : ' V.dealerName  LIKE ' + "'" + req.params.vendor.trim() + "%'"
  let payDt = req.params.paydate == 'ignore' ? 'ignore' : ' V.paymentDate  = ' + "'" + req.params.paydate.trim() + "'"

  if (vendor != 'ignore') {
    if (checkNum != 'ignore') {
      if (payDt != 'ignore') {
        query += ' having ' + vendor + ' and ' + checkNum + ' and ' + payDt
      } else {
        query += ' having ' + vendor + ' and ' + checkNum
      }
    } else if (payDt != 'ignore') {
      query += ' having ' + vendor + ' and ' + payDt
    } else {
      query += ' having ' + vendor
    }
  } else if (checkNum != 'ignore') {
    if (payDt != 'ignore') {
      query += ' having ' + checkNum + ' and ' + payDt
    } else {
      query += ' having ' + checkNum
    }
  } else if (payDt != 'ignore') {
    query += ' having ' + payDt
  } else {
    query += ' having ' + checkNum
  }

  if (payDt == 'ignore' && checkNum == 'ignore' && vendor == 'ignore')
    query = ''

  logger.debug(query)

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);
    const escVendor: string = req.params.vendor + "%";
    const escCheckNum: string = req.params.checkNumber + "%";

    const sql: string = " Select V.paymentCheckNum, V.dealerName, V.paymentDate,  Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V " +
      "group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon " + query

    //    const sql: string = " Select V.paymentCheckNum, V.dealerName, V.paymentDate,  Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V " +
    //    "group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon having V.dealerName LIKE " + "'" + escVendor + "'" + " and  V.paymentCheckNum  LIKE " + "'" + escCheckNum + "'";

    logger.debug(sql)

    try {
      await db.query(query).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }

};


export const getTransactionPaymentByCheckNumVendor: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);
    const escVendor: string = req.params.vendor + "%";
    const escCheckNum: string = req.params.checkNumber + "%";

    const sql: string = " Select V.paymentCheckNum, V.dealerName, V.paymentDate,  Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V " +
      "group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon having V.dealerName LIKE " + "'" + escVendor + "'" + " and  V.paymentCheckNum  LIKE " + "'" + escCheckNum + "'";

    try {
      await db.query(sql).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const getTransactionPaymentByVendor: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    const esc: string = "%" + req.params.vendor + "%";

    const sql: string = " Select V.paymentCheckNum, V.dealerName, V.paymentDate, Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V " +
      "group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon having V.dealerName LIKE " + "'" + esc + "'";

    try {
      await db.query(sql).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const getTransactionPaymentByBidNumber: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    let db: any = swormCfg.db(Constants.configSworm);
    let esc: string = req.params.checkNumber + "%";

    const sql: string = " Select V.paymentCheckNum, V.dealerName, V.paymentDate, Count(*) as POS, sum(paymentAmount) as AdminFee, V.lockStatus, V.icon, V.verifyIcon from FsaCppPurchaseOrderCheckView2 V " +
      "group by V.dealerName, V.paymentDate, V.paymentCheckNum, V.lockStatus, V.icon, V.verifyIcon having V.paymentCheckNum  LIKE " + "'" + esc + "'";

    try {
      await db.query(sql).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const searchPayment: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    try {

      await db.query(
        "Select V.paymentCheckNum, V.dealerName, V.paymentDate, Count(*) as POS, sum(paymentAmount) as AdminFee from FsaCppPurchaseOrderCheckView V " +
        "group by V.dealerName, V.paymentCheckNum having V.paymentCheckNum  =  @checkNumber ",
        { checkNumber: req.params.checkNumber }
      ).then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const insertTransaction: any = async (req: Request, res: Response) => {
  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    let fsaCppPurchaseOrder: any = db.model({ table: "FsaCppPurchaseOrder" });

    let poAmt: string;
    let actualPo: string;
    let adminFeeDue: string;

    if (req.body.poAmount === undefined || req.body.poAmount === null) {
      poAmt = "0.0";
      adminFeeDue = "0.0";
    } else {
      poAmt = req.body.poAmount.toString();
      adminFeeDue = req.body.adminFeeDue.toString();
    }

    let rtnId: number;

    try {
      await db.connect(function () {
        let transaction: any = fsaCppPurchaseOrder({
          poNumber: req.body.poNumber,
          bidNumber: req.body.bidNumber,
          payCd: req.body.payCd,
          poStatus: req.body.poStatus,
          bidType: req.body.bidType,
          adminFeeDue: adminFeeDue,
          poAmount: poAmt,
          dealerName: req.body.dealerName,
          poReportedBy: req.body.poReportedBy,
          poComplete: req.body.poComplete,
          markAsDeleted: 0,
          poFinal: 0,
          cityAgency: req.body.cityAgency,
          poIssueDate: req.body.poIssueDate,
          dateReported: req.body.dateReported,
          dealerFlag: req.body.dealerFlag,
          agencyFlag: req.body.agencyFlag,
          comments: req.body.comments,
          createdBy: req.body.createdBy
        });

        return transaction.save().then(function () {
          rtnId = transaction.id;
          //    logger.debug( transaction.id);
        });
      }).then(function () {
        logger.debug("After Insert id = " + rtnId);
        //  logger.debug('After Insert' +  fsaCppPurchaseOrder.identity());
        res.json({ id: rtnId });
      });
    } catch (e) {
      logger.error(e);
    } finally {
      db.close();
    }
  } else {
    res.json({ message: "Invalid Token" });
  }
};


export const sleep = (milliseconds: number) => {
  const _sleep: any = ms => {
    const end = +new Date() + ms;
    while (+new Date() < end) { }
  };
};


export const updateTransaction: any = async (req: Request, res: Response) => {
  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    let fsaCppPurchaseOrder: any = db.model({ table: "FsaCppPurchaseOrder" });

    let poAmt: string = req.body.poAmount.toString();
    let adminFeeDue: string = req.body.adminFeeDue.toString();

    // convert to String from Number

    try {

      let transaction: any = fsaCppPurchaseOrder({
        id: req.body.id,
        poNumber: req.body.poNumber,
        bidNumber: req.body.bidNumber,
        poAmount: poAmt,
        adminFeeDue: adminFeeDue,
        dealerName: req.body.dealerName,
        bidType: req.body.bidType,
        poStatus: req.body.poStatus,
        poFinal: req.body.poFinal,
        poReportedBy: req.body.poReportedBy,
        cityAgency: req.body.cityAgency,
        poIssueDate: req.body.poIssueDate,
        dateReported: req.body.dateReported,
        payCd: req.body.payCd,
        comments: req.body.comments,
        dealerFlag: req.body.dealerFlag,
        agencyFlag: req.body.agencyFlag,
        markAsDeleted: req.body.markAsDeleted,
        updatedBy: req.body.updatedBy,
        updatedTime: moment().toDate()
      });

      await transaction.update().then((results: Object[]) => {
        res.json({ message: "Transaction Updated " + req.body.id });
      });

    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export const deletePurchaseOrder: any = async (req: Request, res: Response) => {
  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query(
        "update FsaCppPurchaseOrder set markAsDeleted = 1 where id = @id",
        { id: req.params.id }
      ).then((results: Object[]) => {
        res.json({ message: "Transaction deleted " + req.params.id });
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }
  }

};

export const getAllBids: any = async (req: Request, res: Response) => {
  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);

    try {
      await db.query("select * from BidNumberType  order by StartDate desc").then((results: Object[]) => {
        res.send(results);
      });
    } catch (error) {
      logger.error(error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

