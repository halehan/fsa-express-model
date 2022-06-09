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
      db = swormCfg.db(Constants.configSworm);
      await db.query("Select bidNumber from BidNumberType where BidNumber " + includeClause +
        "(Select BidNumber from DealerBidAssoc where dealerName = @vendor) order by bidNumber",
        { vendor: req.params.vendor }).then((results: Object[]) => {
          if (results) {
            res.send(results);
            logger.debug(`getVendorAssocBids ${results}`)   
          } else {
            res.status(404).send({ error: "Record not found" });
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

export let getFsaParms: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken) {
    if (fsaParms === null) {
      let dbParm: any;
      try {
        console.time('getFsaParmsconnection');
        dbParm = await Constants.getDbConnection();
        console.timeEnd('getFsaParmsconnectionEnd');

        await dbParm.query(
          "Select * from FsaParms")
          .then((results: Object[]) => {
            if (results) {
              fsaParms = results;
              res.send(fsaParms);
            } else {
              res.status(404).send({ error: "Transaction not found" });
            }
          });
      } catch (error) {
        logger.error("Fetching transaction failed", error);
      } finally {
        dbParm.close();
      }

    } else {
      res.send(fsaParms);
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getStates: any = async (req: Request, res: Response) => {

  const validToken: string = await _api.authCheckAsync(req, res);

  if (validToken) {
    if (states === null) {
      let db: any;

      try {
        db = await Constants.getDbConnection();

        await db.query(
          "select distinct state from FsaStateCountyCodes order by state")
          .then((results: Object[]) => {
            if (results) {
              states = results;
              res.send(states);
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
      res.send(states);
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getCounties: any = async (req: Request, res: Response) => {

  if (sessionValid(_api.authCheck(req, res))) {

    let db: any;
    try {
      db = await Constants.getDbConnection();

      await db.query("select county from FsaStateCountyCodes where state = @state  order by county asc ",
        { state: req.params.state }).then((results: Object[]) => {
          if (results) {
            res.send(results);
            //      console.log(results);
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

export let getBidTypeNumber: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query("select * from BidNumberType  order by endDate desc").then((results: Object[]) => {
        if (results) {
          res.send(results);
        } else {
          res.status(404).send({ error: "Transaction not found" });
        }
      });
    } catch (error) {
      logger.error(error);
    } finally {
      await db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let getAvailableBidsByDealer: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {
    let db: any

    try {
      db = await Constants.getDbConnection();

      await db.query("Select bidNumber from BidNumberType where BidNumber not in (select bidNumber from DealerBidAssoc where dealerName = @dealerName) order by startDate desc ",
        { dealerName: req.params.dealerName }).then(function (results) {
          res.send(results);
        });
    } catch (error) {
      logger.error(error);
    } finally {
      await db.close();
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getBidAssocByDealer: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    let results;
    let db: any

    try {
      db = await Constants.getDbConnection();

      results = await db.query("select A.id as dealerId, D.dealerName, A.bidNumber from DealershipCodes D, DealerBidAssoc A, BidNumberType B where D.dealerName = A.dealerName " +
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

export let getDealerBidAssoc: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sworm: any = require("sworm");
    let db: any = await Constants.getDbConnection();

    db.query("select D.id as dealerId, D.dealerName, A.bidNumber from DealershipCodes D, DealerBidAssoc A, BidNumberType B where D.dealerName = A.dealerName " +
      "and B.BidNumber = A.bidNumber and A.bidNumber = @bidNumber order by D.dealerName", { bidNumber: req.params.bidNumber }).then(function (results) {
        if (results)
          db.close();
        res.send(results);
      });

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

export let getAllDealers: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {
    const sql: string = `select Id as dealerId, dealerName, active, address, city, state, zipCode, salesContact, 
    phone, mobile, email, updatedBy, updateDate, createdBy, createDate from DealershipCodes order by dealerName asc`;

    //  if (dealers === null) {
    let db: any;
    try {
     db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          dealers = results;
          res.send(dealers);
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
    res.send(dealers);
  }

  //  } else {
  //    res.json({ message: "Invalid Token" });
  // }
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

export let getAgencyTypeByName = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

  
    let db = await Constants.getDbConnection();
    let query: string = "Select AT.agencyPayCode, C.cityAgencyName from AgencyType AT, CityAgencyCodes C" +
      "  where C.agencyTypeId = AT.agencyTypeId and C.cityAgencyName = @agencyName ";

    db.query(query, { agencyName: req.params.agencyName }).then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getAgencyType: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {
    const sql: string = "select * from AgencyType";

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          agencyType = results;
          res.send(agencyType);
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
    res.send(agencyType);
  }

}


export let getBidType: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = "select * from BidType";

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          bidTypes = results;
          res.send(bidTypes);
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
    res.send(bidTypes);
  }

};


export let getCityAgency: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select C.id, C.cityAgencyContact, C.cityAgencyName, C.cityAgencyContactPhone, 
      C.cityAgencyAddress, C.agencyTypeId, C.cityAgencyCounty, C.cityAgencyState, 
      A.agencyPayCode, A.agencyName from CityAgencyCodes
      C, AgencyType A where C.agencyTypeId = A.agencyTypeId order by C.cityAgencyName asc`;

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

export let getCityAgencyByName = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {


    let db = await Constants.getDbConnection();

    await db.query(`select C.cityAgencyName as cityAgencyName, 
       C.cityAgencyCounty as county, C.cityAgencyState as state from CityAgencyCodes  C 
      where C.cityAgencyName = @name `, { name: req.params.name }).then(function (results) {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getItemType = async (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    let db = await Constants.getDbConnection();

    db.query(`select * from FsaCppBidItemCodes where bidNumber = @id and itemNumber = @itemId order by itemMake asc `, { id: req.params.bidId, itemId: req.params.itemId }).then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let deleteVendor = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = `delete from DealershipCodes where Id = @id`;
    let db: any;

    try {
      db = await Constants.getDbConnection();

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        res.json({ message: "Vendor deleted " + req.params.id });
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

export let deleteFeeDistribution = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = `delete from AdminFeeDistributionPct where id = @id`;
    let db: any;

    try {
      db = await Constants.getDbConnection();

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        res.json({ message: "AdminFeeDistributionPct deleted " + req.params.id });
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

export let getFeeDistribution = async (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    let db = await Constants.getDbConnection();

    if (req.params == undefined || req.params.length < 1) {
     await db.query(`select * from AdminFeeDistributionPct order by id desc`).then(function (results) {
        db.close();
        res.send(results);
      });
    } else if ((req.params.payee === undefined || req.params.payee == null)) {
      db.query(`select * from AdminFeeDistributionPct order by id desc`).then(function (results) {
        db.close();
        res.send(results);
      });

    } else {
      db.query(`select * from AdminFeeDistributionPct where (retiredDate IS NULL or retiredDate >= SYSDATETIME()) 
        and RTRIM(LTRIM(payeePartner)) = @payee and RTRIM(LTRIM(bidType)) = @type and  RTRIM(LTRIM(payCD)) = @payCd`, { payee: req.params.payee, type: req.params.type, payCd: req.params.payCd }).then(function (results) {
          db.close();
          res.send(results);
        });
    }



  } else {
    res.json({ message: "Invalid Token" });
  }

}

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

export let getItemTypeByBid = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);

  if (validToken === "success") {

    let db = await Constants.getDbConnection();

   await db.query(`select distinct itemNumber, itemType from FsaCppBidItemCodes where bidNumber = @id`,
      { id: req.params.bidId }).then(function (results) {
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getAllItems: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select id, bidNumber,itemNumber,itemMake, itemDescription, itemType, itemModelNumber from FsaCppBidItemCodes order by createdDate desc`;

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          bidItemCodes = results;
          res.send(bidItemCodes);
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
    res.send(bidItemCodes);
  }

};

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

export let getPoStatusType: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {

    const sql: string = `select * from PoStatusType`;

    let db: any;
    try {
      db = await Constants.getDbConnection();
      await db.query(sql).then((results: Object[]) => {
        if (results) {
          poStatusType = results;
          res.send(poStatusType);
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
    res.send(poStatusType);
  }

};

export let insertAdminFeeDistPct = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);

  if (validToken == "success") {
    const sworm = require("sworm");

    const db: any = await Constants.getDbConnection();
    let table: any = db.model({ table: "AdminFeeDistributionPct" });

    let distributionPct: string = req.body.distributionPct.toString();

    try {
      await db.connect(function () {

        let transaction: any = table({
          payeePartner: req.body.payeePartner, bidType: req.body.bidType,
          payCd: req.body.payCd, distributionPct: distributionPct, effectiveDate: req.body.effectiveDate,
          retiredDate: req.body.retiredDate, createdBy: req.body.createdBy
        });

        return transaction.save().then(function () {
        });
      }).then(function () {
        res.json({ msg: "Partner Dist Saved" });
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


export let updateAdminFeeDistPct = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    let db = await Constants.getDbConnection();
    let adminFeeDistributionPct = db.model({ table: "AdminFeeDistributionPct" });

    let distributionPct: string = req.body.distributionPct.toString();

    let transaction = adminFeeDistributionPct({
      id: req.body.id, payeePartner: req.body.payeePartner, bidType: req.body.bidType,
      payCd: req.body.payCd, distributionPct: distributionPct, effectiveDate: req.body.effectiveDate,
      retiredDate: req.body.retiredDate, updatedBy: req.body.updatedBy
    });

    await transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let deleteAgency: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = "delete from CityAgencyCodes where id = @id";
    let db: any;

    try {
      db = await Constants.getDbConnection();

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        res.json({ message: "Agency deleted " + req.params.id });
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

export let deleteBidItem: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let sql: string = `delete from FsaCppBidItemCodes where id = @id`;
    let db: any;

    try {
      db = await Constants.getDbConnection();

      await db.query(sql, { id: req.params.id }).then((results: Object[]) => {
        logger.debug(`deleteBidItem ${results}`)
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

export let insertBidItemCode: any = async (req: Request, res: Response) => {

  let db: any = await Constants.getDbConnection();

  let fsaCppBidItemCodes: any = db.model({ table: "FsaCppBidItemCodes" });

  let createdTime: Date = new Date();

  let bidItemCode: any = fsaCppBidItemCodes({
    bidNumber: req.body.bidNumber, itemNumber: req.body.itemNumber,
    itemMake: req.body.itemMake, itemType: req.body.itemType,
    itemDescription: req.body.itemDescription, itemModelNumber: req.body.itemModelNumber,
    createdBy: req.body.createdBy, createdDate: createdTime
  });

  try {
    await bidItemCode.save().then(() => {
      res.json(bidItemCode);
    });
  } catch (error) {
    logger.error(error);
  }
  finally {
    db.close();
  }
};

export let insertBid = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    let db = await Constants.getDbConnection();
    let table = db.model({ table: "BidNumberType" });

    let AdminFeeRate: string = req.body.AdminFeeRate.toString();

    let transaction = table({
      BidNumber: req.body.BidNumber, BidType: req.body.BidType,
      BidTitle: req.body.BidTitle, AdminFeeRate: AdminFeeRate, StartDate: req.body.StartDate,
      EndDate: req.body.EndDate, EstimatedCloseoutDate: req.body.EstimatedCloseoutDate,
      ClosedoutDate: req.body.ClosedoutDate, createdBy: req.body.createdBy
    });

    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Inserted " });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let updateBidItem: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let db: any = await Constants.getDbConnection();
    const table: any = db.model({ table: "FsaCppBidItemCodes" });
    try {

      let transaction: any = table({
        id: req.body.id, bidNumber: req.body.bidNumber, itemNumber: req.body.itemNumber,
        itemMake: req.body.itemMake, itemType: req.body.itemType, itemDescription: req.body.itemDescription,
        itemModelNumber: req.body.itemModelNumber, updatedBy: req.body.updatedBy
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


export let updateBid = async (req: Request, res: Response) => {

  const validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    let db = await Constants.getDbConnection();
    let table = db.model({ table: "BidNumberType" });

    let AdminFeeRate: string = req.body.AdminFeeRate.toString();

    let transaction = table({
      id: req.body.id, BidNumber: req.body.BidNumber, BidType: req.body.BidType,
      BidTitle: req.body.BidTitle, AdminFeeRate: AdminFeeRate, StartDate: req.body.StartDate,
      EndDate: req.body.EndDate, EstimatedCloseoutDate: req.body.EstimatedCloseoutDate,
      ClosedoutDate: req.body.ClosedoutDate, updatedBy: req.body.updatedBy
    });

   await transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Inserted " });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let insertCityAgency = async (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken === "success") {


    let db = await Constants.getDbConnection();
    let table = db.model({ table: "CityAgencyCodes" });

    let transaction = table({
      agencyTypeId: req.body.agencyTypeId,
      cityAgencyName: req.body.cityAgencyName,
      cityAgencyAddress: req.body.cityAgencyAddress,
      cityAgencyCounty: req.body.cityAgencyCounty,
      cityAgencyState: req.body.cityAgencyState,
      cityAgencyContact: req.body.cityAgencyContact,
      cityAgencyContactPhone: req.body.cityAgencyContactPhone
    });
    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export let updateCityAgency: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {

    let db: any = await Constants.getDbConnection();
    let table: any = db.model({ table: "CityAgencyCodes" });

    let transaction: any = table({
      id: req.body.id,
      agencyTypeId: req.body.agencyTypeId,
      cityAgencyName: req.body.cityAgencyName,
      cityAgencyAddress: req.body.cityAgencyAddress,
      cityAgencyCounty: req.body.cityAgencyCounty,
      cityAgencyState: req.body.cityAgencyState,
      cityAgencyContact: req.body.cityAgencyContact,
      cityAgencyContactPhone: req.body.cityAgencyContactPhone,
      updatedBy: req.body.updatedBy
    });


    await transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};
