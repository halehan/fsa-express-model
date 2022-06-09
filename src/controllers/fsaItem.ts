import { Response, Request } from "express";
import * as moment from "moment";
import { Constants } from "../utils/constants";
import { Api } from "./api";
const log4js = require("log4js");

const logger = log4js.getLogger();
logger.level = process.env.LOGGINGLEVEL

let _api: Api = new Api();

export let getPurchasePoItem: any = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

    const sqlString: string = `Select I.fsaCppPurchaseOrderId, I.id, I.itemNumber, I.itemDescription, I.itemType, I.itemMake, I.itemModelNumber,I.qty, 
       I.itemAmount, I.adminFeeDue, ISNULL(sum(P.paymentAmount),0) as paymentAmount,  
       I.adminFeeDue - ISNULL(sum(P.paymentAmount),0) as balance from FsaCppItem I 
       LEFT OUTER JOIN FsaCppPayment P on I.id = P.fsaCppItemId where I.markAsDeleted = 0
       and I.fsaCppPurchaseOrderId = @id group by  I.id, I.fsaCppPurchaseOrderId, I.itemNumber, I.itemDescription, 
       I.itemType, I.itemMake, I.itemModelNumber, I.qty, I.itemAmount, I.adminFeeDue`

    // tslint:disable-next-line:typedef
    db.query(sqlString, { id: req.params.fsaPurchaseOrderId }).then(function (results: any) {

      res.send(results);
      db.close();
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let verifyItemHasPayment: Object = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    try {
      var sworm: any = require("sworm");
      var db: any = sworm.db(Constants.configSworm);

      await db.query(
        `Select id from FsaCppItem I where id = @id and markAsDeleted = 0 and EXISTS 
         (Select fsaCppItemId from FsaCppPayment where fsaCppItemId = I.id)`,
        { id: req.params.itemId }
      ).then((results: Object) => {
        if (results) {
          res.send(results);
        } else {
          res.status(300).send({ error: "Po Item not found" });
        }
      });
    } catch (error) {
      logger.error("Fetching Item failed", error);
    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export let getPoItem: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm: any = require("sworm");

    try {
      var db: any = sworm.db(Constants.configSworm);

      const sqlString: string = `Select I.fsaCppPurchaseOrderId, I.id, I.itemNumber, I.itemDescription, I.itemType, I.itemMake, 
         I.itemModelNumber,I.qty, I.itemAmount, I.adminFeeDue, ISNULL(sum(P.paymentAmount),0) as paymentAmount,  
         I.adminFeeDue - ISNULL(sum(P.paymentAmount),0) as balance from FsaCppItem I 
         LEFT OUTER JOIN FsaCppPayment P on I.id = P.fsaCppItemId where I.markAsDeleted = 0 
         and I.fsaCppPurchaseOrderId = @id group by  I.id, I.fsaCppPurchaseOrderId, I.itemNumber,
         I.itemDescription, I.itemType, I.itemMake, I.itemModelNumber, I.qty, I.itemAmount, I.adminFeeDue`

      await db.query(sqlString, { id: req.params.fsaPurchaseOrderId }).then((results: Object) => {
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

export let getDerivedItem: any = (req: Request, res: Response) => {

  const sworm: any = require("sworm");
  let db: any = sworm.db(Constants.configSworm);

  db.query(`select distinct I.* from FsaCppBidItemCodes I where I.bidNumber = @bidNumber 
      and I.itemNumber =  @itemNumber and I.itemType = @itemType `,
    {
      bidNumber: req.params.bidNumber, itemNumber: req.params.itemNumber,
      itemType: req.params.itemType
    }).then((results: Object) => {
      db.close();
      res.send(results);
    });

};

export let getItemAmountByPoId: any = (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm: any = require("sworm");
    var db: any = sworm.db(Constants.configSworm);

    db.query(`select I.fsaCppPurchaseOrderId, sum(i.itemAmount) as amt from FsaCppItem I where I.fsaCppPurchaseOrderId = 
      @id and markAsDeleted = 0 group by I.fsaCppPurchaseOrderId`,
      { id: req.params.poId }).then((results: Object) => {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getItem: Object = async (req: Request, res: Response) => {

  if (await _api.authCheckAsync(req, res) === "success") {

    const sworm: any = require("sworm");
    let db: any;
    try {
      db = sworm.db(Constants.configSworm);
      await db.query(`select I.*, P.poIssueDate as poIssueDate from FsaCppItem I, FsaCppPurchaseOrder P where P.id = I.fsaCppPurchaseOrderId and 
        I.id = @itemId and I.markAsDeleted = 0`, { itemId: req.params.itemId }).then((results: Object) => {
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

}

export let deleteItem: Object = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken === "success") {

    try {

      var sworm = require("sworm");
      var db = sworm.db(Constants.configSworm);

      await db.query(`update FsaCppItem set markAsDeleted = 1, updatedBy = @updatedBy where id = @itemId`,
        { itemId: req.params.itemId, updatedBy: req.params.updatedBy })
        .then((results) => {
          if (results) {
            res.send(results);
          } else {
            res.status(500).send({ error: "Error deleting item" });
          }
        });

    } catch (error) {
      logger.error(error)

    } finally {
      db.close();

    }

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let deleteItemsByPo = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken === "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query(`update FsaCppItem set markAsDeleted = 1 where fsaCppPurchaseOrderId = @poId`,
      { poId: req.params.poId }).then((results: Object) => {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let insertItem: any = (req: Request, res: Response) => {

  var validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    const sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var fsaCppItem = db.model({ table: "FsaCppItem" });

    let facFee: string;
    let fsaFee: string;
    let ffcaFee: string;
    let adminFeeDue: string;
    let itemAmount: string;
    let markAsDeleted: number;

    if (req.body.fsaFee !== undefined) { fsaFee = req.body.fsaFee.toString(); }
    if (req.body.facFee !== undefined) { facFee = req.body.facFee.toString(); }
    if (req.body.ffcaFee !== undefined) { ffcaFee = req.body.ffcaFee.toString(); }
    if (req.body.adminFeeDue !== undefined) { adminFeeDue = req.body.adminFeeDue.toString(); }
    if (req.body.itemAmount !== undefined) { itemAmount = req.body.itemAmount.toString(); }

    db.connect(function () {

      const transaction: any = new fsaCppItem({
        fsaCppPurchaseOrderId: req.body.fsaCppPurchaseOrderId, bidItemCodeId: req.body.bidItemCodeId, itemNumber: req.body.itemNumber,
        itemDescription: req.body.itemDescription, itemType: req.body.itemType, itemMake: req.body.itemMake, itemModel: req.body.itemModel,
        qty: req.body.qty, itemAmount: itemAmount, adminFeeDue: adminFeeDue, itemModelNumber: req.body.itemModelNumber,
        estimatedDeliveryDate: req.body.estimatedDeliveryDate, fsaFee: fsaFee, facFee: facFee, ffcaFee: ffcaFee, markAsDeleted: 0,
        createdBy: req.body.createdBy
      });

      return transaction.insert().then(function () {

      });
    }).then(function () {
      db.close();
      res.json({ message: "Transaction created " + req.body.transactionNumber });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let updateItem = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  logger.debug(validToken);

  if (validToken === "success") {

    let sworm: any = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var fsaCppItem = db.model({ table: "FsaCppItem" });

    let facFee: string;
    let fsaFee: string;
    let ffcaFee: string;
    let adminFeeDue: string;
    let itemAmount: string;

    if (req.body.fsaFee !== undefined) { fsaFee = req.body.fsaFee.toString(); }
    if (req.body.facFee !== undefined) { facFee = req.body.facFee.toString(); }
    if (req.body.ffcaFee !== undefined) { ffcaFee = req.body.ffcaFee.toString(); }
    if (req.body.adminFeeDue !== undefined) { adminFeeDue = req.body.adminFeeDue.toString(); }
    if (req.body.itemAmount !== undefined) { itemAmount = req.body.itemAmount.toString(); }

    let transaction: any = fsaCppItem({
      id: req.body.id, bidItemCodeId: req.body.bidItemCodeId, itemNumber: req.body.itemNumber, itemDescription:
        req.body.itemDescription, itemType: req.body.itemType, itemMake: req.body.itemMake,
      itemModelNumber: req.body.itemModelNumber, qty: req.body.qty, itemAmount: itemAmount,
      estimatedDeliveryDate: req.body.estimatedDeliveryDate, adminFeeDue: adminFeeDue, fsaFee: fsaFee, facFee: facFee, ffcaFee: ffcaFee,
      updatedBy: req.body.updatedBy, markAsDeleted: req.body.markAsDeleted, updatedTime: moment().toDate()
    });

    try {
      await transaction.update().then((results: Object) => {
        res.json({ message: "Item Updated " + req.body.id });
      });

    } catch (error) {

    } finally {
      db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};