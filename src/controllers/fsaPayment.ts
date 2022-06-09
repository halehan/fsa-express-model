import { Response, Request, NextFunction } from "express";
import * as moment from "moment";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
import * as log4js from "log4js";

const logger = log4js.getLogger();

let _api: Api = new Api();

export let getPaymentTest = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

    let esc: string = "%" + req.params.checkNum + "%";
    let sql: string = " Select * from FsaCppPayment where paymentCheckNum LIKE" + "'" + esc + "'" + " order by paymentNumber desc"
    logger.debug(sql);

    db.query(sql, { checkNum: req.params.checkNum }).then((results: Object) => {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getLockedPaymentList: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm: any = require("sworm");
    let db: any = sworm.db(Constants.configSworm);

    try {
     await db.query(`Select * from FsaPaymentLock order by createdDate desc`).then((results) => {
      
        res.send(results);
        console.log(`results ${JSON.stringify(results)}`)
      });
    } catch(error) {logger.error(` Error retrieving rows from FsaPaymentLock ${error}`)}
    finally {  db.close();}

  } else {
    res.json({ message: "Invalid Token" });
  }


}

export let getVendorFinePayments: any = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

      db.query(`select * from FsaCppVendorFinePayment where vendorFineId = @id order by createdDate desc`,
      { id: req.params.id }).then((results) => {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getAllVendorFines: any = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

    db.query(`select v.*, D.dealerName, 
      T.StartDate from BidNumberType T, DealershipCodes D, FsaCppVendorFine V where  D.id = v.dealerId 
      and  T.BidNumber = V.contractNumber order by createdDate desc`).then((results: Object) => {
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getPaymentsByItemId: any = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

    db.query(`select * from FsaPaymentLockView where fsaCppItemId = @itemId  order by paymentNumber desc`,
      { itemId: req.params.itemId }).then((results) => {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getLockedPaymentDates: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm: any = require("sworm");
    let db: any = sworm.db(Constants.configSworm);

    await db.query(`select paymentDate from fsaCppCheckPaymentLock group by paymentDate order by paymentDate `).then((results) => {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getPaymentsByPoNumber = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query(`select * from FsaCppPayment where fsaCppItemId = @itemId and markAsDeleted = 0 
      order by paymentNumber desc`, { itemId: req.params.itemId }).then((results: Object) => {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export const insertPayment: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm :any = require("sworm");
    const db: any = sworm.db(Constants.configSworm);
    let fsaCppPayment: any = db.model({ table: "FsaCppPayment" });

    let facAlloc: string;
    let fsaAlloc: string;
    let ffcaAlloc: string;
    let lateFeeAmt: string;
    let paymentAmount: string;
    let fsaRefundAmount: string;
    let totalAlloc: string;
    let rtnId: number;


    if (isEmpty(req.body.fsaAlloc)) { 
      fsaAlloc = req.body.fsaAlloc.toString(); 
    }
    if ( ! isEmpty(req.body.facAlloc)) { facAlloc = req.body.facAlloc.toString(); }
    if ( ! isEmpty(req.body.ffcaAlloc)) { ffcaAlloc = req.body.ffcaAlloc.toString(); }
    if ( ! isEmpty(req.body.lateFeeAmt)) { lateFeeAmt = req.body.lateFeeAmt.toString(); }
    if ( ! isEmpty(req.body.paymentAmount)) { paymentAmount = req.body.paymentAmount.toString(); }
    if ( ! isEmpty(req.body.fsaRefundAmount)) { fsaRefundAmount = req.body.fsaRefundAmount.toString(); }
    if ( ! isEmpty(req.body.totalAlloc)) { totalAlloc = req.body.totalAlloc.toString(); }

    try {
      await db.connect(function () {
        let transaction: any = fsaCppPayment({
        fsaCppPurchaseOrderId: req.body.fsaCppPurchaseOrderId, fsaCppItemId: req.body.fsaCppItemId,
        fsaCppReportId: req.body.fsaReportId, paymentDate: req.body.paymentDate, deliveryDate: req.body.deliveryDate,
        paymentAmount: paymentAmount, paymentNumber: req.body.paymentNumber,
        paymentCheckNum: req.body.paymentCheckNum, correction: req.body.correction,
        auditDifference: req.body.auditDifference, lateFeeAmt: lateFeeAmt,
        lateFeeCheckNum: req.body.lateFeeCheckNum, lateFeeCheckDate: req.body.lateFeeCheckDate,
        fsaRefundAmount: fsaRefundAmount, fsaRefundCheckNum: req.body.fsaRefundCheckNum,
        fsaRefundDate: req.body.fsaRefundDate, poIssueDate: req.body.poIssueDate,
        fsaAlloc: fsaAlloc, facAlloc: facAlloc, ffcaAlloc: ffcaAlloc, markAsDeleted: 0,
        totalAlloc: totalAlloc, dateReported: req.body.dateReported, qtyDelivered: req.body.qtyDelivered,
        dateReceived: req.body.dateReceived, comment: req.body.comment, createdBy: req.body.createdBy
      });

      return transaction.insert().then(function () {
        rtnId = transaction.id;
      });
    }).then(function () {
      logger.debug("After Insert id = " + rtnId);
      res.json({ id: rtnId });
    });

    }  catch (e) {
      logger.error(e);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const insertPaymentLockRecord: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm :any = require("sworm");
    const db: any = sworm.db(Constants.configSworm);
    let fsaPaymentLock: any = db.model({ table: "FsaPaymentLock" });

    let lockStartDate: string;
    let lockEndDate: string;
    let rtnId: number;

    try {
      lockStartDate = req.body.lockStartDate;
      lockEndDate = req.body.lockEndDate;
    } catch (error) {}

    try {
      await db.connect(function () {
        let transaction: any = fsaPaymentLock({
        lockStartDate: lockStartDate, lockEndDate: lockEndDate, createdBy: req.body.createdBy
      });

      return transaction.insert().then(function () {
        rtnId = transaction.id;
      });
    }).then(function () {
      logger.debug("After Insert id = " + rtnId);
      res.json({ id: rtnId });
    });

    }  catch (e) {
      logger.error(e);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export const isEmpty = (obj) =>  {
  return (obj === null || undefined) ? true : false;
  };

export let deletePayment = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("delete from FsaCppPayment where id = @id", { id: req.params.id }).then((results: Object) => {
      db.close();
      res.json({ message: "Transaction deleted " + req.params.id });
    });

  }

}


export let updateFine = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
    var fine = db.model({ table: "FsaCppVendorFine" });

    let fineAmount: string;
    let fineAmountPaid: string;

    if (req.body.fineAmount != undefined) { fineAmount = req.body.fineAmount.toString(); }
    if (req.body.fineAmountPaid != undefined) { fineAmountPaid = req.body.fineAmountPaid.toString(); }

    var row = fine({
          id: req.body.id,
          dealerId: req.body.dealerId,
          status: req.body.status,
          reason: req.body.reason,
          poNumber: req.body.poNumber,
          quarter: req.body.quarter,
          contractNumber: req.body.contractNumber,
          comments: req.body.comments,
          fineAmount: fineAmount,
          updateDate: moment().toDate(),
          updatedBy: req.body.updatedBy
    })

    row.update();

    db.close();

    res.send(row);
  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let deleteFine = async (req: Request, res: Response) => {

  logger.debug(" deleteFine() called passing Id " + req.params.id)

  var validToken = await _api.authCheckAsync(req, res);

  if (validToken == "success") {

    try {

      var sworm = require("sworm");
      var db = sworm.db(Constants.configSworm);

      await db.query("delete from FsaCppVendorFine where id = @id", { id: req.params.id }).then((results: Object) => {

        res.json({ message: "Fine deleted " + req.params.id });
      });

    } catch (error) {
      logger.error("Error deleteing Fine " + req.params.id + " " + error)
    } finally {
      db.close();
    }

  }

}


export let insertFine = async (req: Request, res: Response) => {

  var validToken = await _api.authCheckAsync(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
    var fsaCppVendorFine = db.model({ table: "FsaCppVendorFine" });

    let fineAmount: string;
    let fineAmountPaid: string;
    let rtnId: number;
    logger.debug(req.body.type);
    logger.debug(req.body.reason);

    if (req.body.fineAmount != undefined) { fineAmount = req.body.fineAmount.toString(); }
    if (req.body.fineAmountPaid != undefined) { fineAmountPaid = req.body.fineAmountPaid.toString(); }

    try {

      await db.connect(() => {
        var transaction = fsaCppVendorFine({
          dealerId: req.body.dealerId,
          status: req.body.status,
          reason: req.body.reason,
          poNumber: req.body.poNumber,
          quarter: req.body.quarter,
          contractNumber: req.body.contractNumber,
          comments: req.body.comments,
          fineAmount: fineAmount,
          createdDate: moment().toDate(),
          createdBy: req.body.createdBy
        });

        return transaction.insert().then(() => {
          rtnId = transaction.id;
          res.json({ id: rtnId });
        });
      }).then(() => {
        logger.debug("After Insert id = " + rtnId);
      });
    } catch (error) {
      logger.error("Error Inserting Fine " + error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let updatePayment = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
    var fsaCppPayment = db.model({ table: "FsaCppPayment" });

    let facAlloc: string;
    let fsaAlloc: string;
    let ffcaAlloc: string;
    let lateFeeAmt: string;
    let paymentAmount: string;
    let fsaRefundAmount: string;
    let totalAlloc: string;

    if (req.body.fsaAlloc != undefined) { fsaAlloc = req.body.fsaAlloc.toString(); }
    if (req.body.facAlloc != undefined) { facAlloc = req.body.facAlloc.toString(); }
    if (req.body.ffcaAlloc != undefined) { ffcaAlloc = req.body.ffcaAlloc.toString(); }
    if (req.body.lateFeeAmt != undefined) { lateFeeAmt = req.body.lateFeeAmt.toString(); }
    if (req.body.paymentAmount != undefined) { paymentAmount = req.body.paymentAmount.toString(); }
    if (req.body.fsaRefundAmount != undefined) { fsaRefundAmount = req.body.fsaRefundAmount.toString(); }
    if (req.body.totalAlloc != undefined) { totalAlloc = req.body.totalAlloc.toString(); }


    var row = fsaCppPayment({
      fsaCppItemId: req.body.fsaCppItemId,
      paymentDate: req.body.paymentDate, paymentAmount: paymentAmount, deliveryDate: req.body.deliveryDate,
      paymentNumber: req.body.paymentNumber, paymentCheckNum: req.body.paymentCheckNum,
      correction: req.body.correction, auditDifference: req.body.auditDifference, lateFeeAmt: lateFeeAmt,
      lateFeeCheckNum: req.body.lateFeeCheckNum, lateFeeCheckDate: req.body.lateFeeCheckDate,
      fsaRefundAmount: fsaRefundAmount, fsaRefundCheckNum: req.body.fsaRefundCheckNum,
      fsaRefundDate: req.body.fsaRefundDate, poIssueDate: req.body.poIssueDate,
      markAsDeleted: req.body.markAsDeleted, fsaAlloc: fsaAlloc, facAlloc: facAlloc,
      ffcaAlloc: ffcaAlloc, totalAlloc: totalAlloc, comment: req.body.comment,
      dateReported: req.body.dateReported, dateReceived: req.body.dateReceived, id: req.body.id,
      updatedBy: req.body.updatedBy, qtyDelivered: req.body.qtyDelivered,
      updateDate: moment().toDate()
    })
    row.update();

    db.close();

    res.send(row);
  } else {
    res.json({ message: "Invalid Token" });
  }
}