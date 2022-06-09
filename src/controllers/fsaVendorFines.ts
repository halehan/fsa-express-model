import { Response, Request, NextFunction } from "express";
import * as moment from "moment";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
import * as log4js from "log4js";
import { deleteBatchImport } from "./fsaImportServices";

const logger = log4js.getLogger();

let _api: Api = new Api();

export let getVendorFinePayments: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);
  let db: any = null;

  //logger.debug(` getVendorFinePayments ${validToken} `)

  if (validToken === "success") {

    try {

      const sworm: any = require("sworm");
      db = await sworm.db(Constants.configSworm);

     await db.query(`select * from FsaCppVendorFinePayment where vendorFineId = @id order by createdDate desc`,
        { id: req.params.id }).then((results) => {
          res.send(results);
        });

    } catch (error) { logger.debug(` Error getVendorFine: ${error} `) }
    finally { db.close(); }

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getVendorFine: any = async (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  //logger.debug(` getVendorFine ${validToken} `)

  if (validToken === "success") {
    let db: any = null;

    try {

      const sworm: any = require("sworm");
      db = await sworm.db(Constants.configSworm);

      console.log(`  getVendorFine  ${req.params.id} `)

     await db.query(`select id, dealerId, status, reason, poNumber,  quarter,  contractNumber, comments, fineAmount
    from FsaCppVendorFine where id = @id`, { id: req.params.id }).then((results: Object) => {
        res.send(results);
      });

    } catch (error) {
      logger.debug(` Error getVendorFine: ${error} `)

    } finally { db.close(); }

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getAllVendorFines: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  logger.debug(` getAllVendorFines ${validToken} `)

  let db: any = null;

  if (validToken === "success") {

    try {

      const sworm: any = require("sworm");
      db = await sworm.db(Constants.configSworm);

    await  db.query(`select f.id,  f.poNumber, f.createdDate, f.dealerId, D.dealerName, f.status, f.reason, f.contractNumber, sum(isnull(p.paymentAmount,0)) as paymentAmount,
    isnull(f.fineAmount,0) as fineAmount, isnull(f.fineAmount,0) - sum(isnull(p.paymentAmount,0))  as balance
    from FsaCppVendorFine f join DealershipCodes D on D.id = f.dealerId
    left join FsaCppVendorFinePayment p on f.id = p.vendorFineId 
    group by f.createdDate, f.id,  f.poNumber, f.dealerId, D.dealerName, f.status, f.reason, f.contractNumber, f.fineAmount
    order by f.createdDate desc`).then((results: Object) => {
        res.send(results);
      });


    } catch (error) {
      logger.debug(` Error getVendorFine: ${error} `)

    } finally { db.close(); }

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export const isEmpty = (obj) => {
  return (obj === null || undefined) ? true : false;
};

export let deleteFinePayment = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);
  let db = null;

  if (validToken == "success") {

    try {

      const sworm = require("sworm");
      db = await sworm.db(Constants.configSworm);

      await db.query(`delete from FsaCppVendorFinePayment where id = @id`, { id: req.params.id }).then((results: Object) => {
        res.json({ message: "Transaction deleted " + req.params.id });
      });

    } catch (error) { logger.error(error) }
    finally { db.close(); }
  }

}

export const insertFinePayment: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm: any = require("sworm");
    const db: any = await sworm.db(Constants.configSworm);
    let fsaCppVendorFinePayment: any = db.model({ table: "FsaCppVendorFinePayment" });

    let paymentAmount: string;
    let rtnId: number;


    if (!isEmpty(req.body.paymentAmount)) { paymentAmount = req.body.paymentAmount.toString(); }

    try {
      await db.connect(function () {
        let transaction: any = fsaCppVendorFinePayment({
          vendorFineId: req.body.vendorFineId,
          checkNumber: req.body.checkNumber,
          paymentDate: req.body.paymentDate,
          paymentAmount: req.body.paymentAmount,
          comments: req.body.comments,
          createdBy: req.body.createdBy,
          createdDate: moment().toDate()
        });

        return transaction.insert().then(function () {
          rtnId = transaction.id;
        });
      }).then(function () {
        logger.debug("After Insert id = " + rtnId);
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

export let updateFinePayment = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);

  if (validToken == "success") {
    let db = null;

    try {

      const sworm = require("sworm");
      db = await sworm.db(Constants.configSworm);
      let finePayment: any = db.model({ table: "FsaCppVendorFinePayment" });

      let paymentAmount: string;

      if (req.body.paymentAmount != undefined) { paymentAmount = req.body.paymentAmount.toString(); }


      let row = finePayment({
        id: req.params.id,
        vendorFineId: req.body.vendorFineId,
        checkNumber: req.body.checkNumber,
        paymentDate: req.body.paymentDate,
        paymentAmount: paymentAmount,
        comments: req.body.comments,
        updatedBy: req.body.updatedBy,
        updateDate: moment().toDate()
      })

    await   row.update();
      res.send(row);

    } catch (error) {
      console.error(error)
    } finally { db.close() }
  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let updateFine = (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);
  let db = null;

  if (validToken == "success") {

    try {

      let sworm = require("sworm");
      db = sworm.db(Constants.configSworm);
      let fine = db.model({ table: "FsaCppVendorFine" });

      let fineAmount: string;
      let fineAmountPaid: string;

      if (req.body.fineAmount != undefined) { fineAmount = req.body.fineAmount.toString(); }
      if (req.body.fineAmountPaid != undefined) { fineAmountPaid = req.body.fineAmountPaid.toString(); }

      let row = fine({
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
      res.send(row);

    } catch (error) { }
    finally { db.close(); }


  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let deleteFine = async (req: Request, res: Response) => {

 logger.debug(" deleteFine() called passing Id " + req.params.id)

  const validToken = await _api.authCheckAsync(req, res);
  let db = null;

  if (validToken == "success") {

    try {

      const sworm = require("sworm");
      db = await sworm.db(Constants.configSworm);

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

  const validToken = await _api.authCheckAsync(req, res);
  let db = null;

  if (validToken == "success") {

    const sworm = require("sworm");
    db = sworm.db(Constants.configSworm);
    let fsaCppVendorFine = db.model({ table: "FsaCppVendorFine" });

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