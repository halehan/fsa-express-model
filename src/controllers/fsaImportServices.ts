import { Response, Request } from "express";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
const log4js = require("log4js");
const swormCfg: any = require("sworm");
const crypto: any = require("crypto");

const logger = log4js.getLogger();
logger.level = process.env.LOGGINGLEVEL

let _api: Api = new Api();

let states: Object[] = null;
let fsaParms: Object[] = null;
let bidTypeNumber: Object[] = null;
let dealers: Object[] = null;
let agencyType: Object[] = null;
let bidTypes: Object[] = null;
let cityAgency: Object[] = null;
let bidItemCodes: Object[] = null;
let allBidItemCodes: Object[] = null;
let poStatusType: Object[] = null;

export let deleteBatchImport = async (req: Request, res: Response) => {

  const validToken: string =  _api.authCheckAsync(req, res);

  if (validToken === "success") {
    let db: any = swormCfg.db(Constants.configSworm);
    let qry: string;

    qry = 'delete from FsaCppImport where importHash  =  @importHash'

    try {
      await db.query(qry, { importHash: req.params.importHash }).then((results: Object[]) => {
        res.json({
          message: "Inport Delete.  importHash: " + req.params.importHash
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

}


export let insertVendorContractAssoc: any = async (req: Request, res: Response) => {

  let db: any = swormCfg.db(Constants.configSworm);

  let dealerBidAssoc: any = db.model({ table: "DealerBidAssoc" });

  let transaction: any = dealerBidAssoc({
    bidNumber: req.body.bidNumber, dealerName: req.body.dealerName
  });

  try {
    await transaction.save().then(() => {
      res.json(transaction);
    });
  } catch (error) {
    logger.error(error);
  }
  finally {
    db.close();
  }

};

export let deleteVendorAssocBid: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = "delete from DealerBidAssoc where id = @id";
    let db: any;

    try {
      db = swormCfg.db(Constants.configSworm);

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        logger.debug(`Deleted VendorBid ${req.params.id}`)
        res.json({ message: "Asssociation Removed " + req.params.id });
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

export let getVendorAssocBids: any = async (req: Request, res: Response) => {

  if (sessionValid(_api.authCheck(req, res))) {

    let includeClause: string = "in";

    if (req.params.included === "false") {
      includeClause = "not in";
    }

    let db: any;
    try {
     await db.transaction(() => {
      db = swormCfg.db(Constants.configSworm);
       db.query("Select bidNumber from BidNumberType where BidNumber " + includeClause +
        "(Select BidNumber from DealerBidAssoc where dealerName = @vendor) order by bidNumber",
        { vendor: req.params.vendor }).then((results: Object[]) => {
          if (results) {
            res.send(results);
            logger.debug(`getVendorAssocBids ${results}`)   
          } else {
            res.status(404).send({ error: "Record not found" });
          }
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

function sessionValid(token: string): boolean {
  return token.toUpperCase() === "SUCCESS" ? true : false;
}

export let getAdminFee: any =  async (req: Request, res: Response) => {

  if (sessionValid(_api.authCheck(req, res))) {

    console.time('getAdminFee');
    const db =   await Constants.getDbConnection();
    console.timeEnd('getAdminFee');

    try { 
     await db.query("select * from BidNumberType where bidNumber = @id",
         { id: req.params.bidNumber }).then((results: Object[]) => {
          if (results) {
            res.send(results);
            logger.debug(`getAdminFee ${results}`)   
          } else {
            res.status(404).send({ error: "Record not found" });
          }
        });
    } catch (error) { logger.error(error) }
    finally {
     db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};



export let getBidAssocByDealer: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    let results;
    let db: any

    try {
      db = await Constants.getDbConnection();

      results = await db.query("select A.id, D.dealerName, A.bidNumber from DealershipCodes D, DealerBidAssoc A, BidNumberType B where D.dealerName = A.dealerName " +
        "and B.BidNumber = A.bidNumber and A.dealerName = @dealerName order by B.startDate desc", { dealerName: req.params.dealerName });

    } catch (error) { logger.error(error); }
    finally {
      await db.close();
    }

    res.send(results);
    /*
        db.query("select A.id, D.dealerName, A.bidNumber from DealershipCodes D, DealerBidAssoc A, BidNumberType B where D.dealerName = A.dealerName " +
          "and B.BidNumber = A.bidNumber and A.dealerName = @dealerName order by B.startDate desc", { dealerName: req.params.dealerName }).then(function (results) {
            if (results)
              db.close();
            res.send(results);
          }); */

  } else {
    res.json({ message: "Invalid Token" });
  }

}



export let updateDealer: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let db: any = await Constants.getDbConnection();
    const table: any = db.model({ table: "DealershipCodes" });

    let transaction: any = table({
      id: req.body.Id, dealerName: req.body.dealerName, active: req.body.active, updatedBy: req.body.updatedBy
    });

    try {
      await db.connect(function () {

        return transaction.update().then(function () {
        });
      }).then(function () {
        res.json({ msg: "Vendor Saved" });
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

export let insertDealer: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let rtnId: number;

    if (req.body.active === undefined || req.body.active === null) {
      req.body.active = 1;
    }

    let db: any = await Constants.getDbConnection();
    let vendor: any = db.model({ table: "DealershipCodes" });

    try {
      await db.connect(async function () {
        let transaction: any = vendor({
          dealerName: req.body.dealerName, active: req.body.active, createdBy: req.body.createddBy
        });

        return await transaction.save().then(function () {
          rtnId = transaction.id;
        });
      }).then(function () {
        logger.debug("After Insert vendor id = " + rtnId);
        res.json({ id: rtnId });
      });
    } catch (e) {
      logger.error(e);
    } finally {
      await db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let getDealer = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

   
    let db = await Constants.getDbConnection();
    const sortVal = req.params.sort;
    let sql: string;
    //  sql = 'select * from DealershipCodes order by dealerName asc';
    sql = "select * from DealershipCodes";

    if (sortVal === "update") {
      //   sql = 'select * from DealershipCodes order by UpdateDate desc';
    } else if (sortVal == "insert") {
      sql = "select * from DealershipCodes order by createDate desc";
    }
    await db.query(sql).then(function (results) {
      if (results)
        db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
}

export let getImportRowsByTableName: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select importHash, importFileName, importTable, importDescription, 
      importFileSize, importByUser, importTime from FsaCppImport 
      where importTable = @tableName order by importTime desc` 

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql, { tableName: req.params.tableName }).then((results: Object[]) => {
        if (results) {
      //    logger.debug(` results ${JSON.stringify(results)} `)
          res.send(results);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
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


export let getItemCodeTypeById = async (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  
  if (validToken == "success") {

    let db = await Constants.getDbConnection();

    await db.query(`select * from FsaCppBidItemCodes where id = @id`, { id: req.params.id }).then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getAllBids: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select * from BidNumberType order by StartDate desc`;

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          allBidItemCodes = results;
          res.send(allBidItemCodes);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
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


export let deleteBid: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = `delete from BidNumberType where id = @id`;
    let db: any;

    try {
      db = await Constants.getDbConnection();

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        logger.debug(`deleteBid ${results}`)
        res.json({ message: "Contract Item deleted " + req.params.id });
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



export let getImports: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select id, importHash, importTable, importFileName, importDescription, importByUser, importTime, icon from FsaCppImportListView 
      order by importTime desc`;

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          res.send(results);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
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


export let insertImport: any = async (req: Request, res: Response) => {
  let db: any = await Constants.getDbConnection();
  const table: any = db.model({ table: "FsaCppImport" });
  let _importTime: Date = new Date();
  const _importHash: string = crypto.randomBytes(12).toString("hex");

  let fsaCppImport: any = table({
    importHash: _importHash, importFileName: req.body.importFileName,
    importFileType: req.body.importFileType, importFileSize: req.body.importFileSize,
    importTable: req.body.importTable, importDescription: req.body.importDescription,
    importByUser: req.body.importByUser, importTime: _importTime
  });

  try {
    await fsaCppImport.save().then(() => {
      res.json(fsaCppImport);
    });
  } catch (error) {
    logger.error(error);
  }
  finally {
    db.close();
  }
};

