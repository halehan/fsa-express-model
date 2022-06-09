import { Response, Request, NextFunction } from "express";
import { Constants } from "../utils/constants";
import { Api } from "../controllers/api";
import * as dotenv from "dotenv";
import { SIGQUIT } from "constants";
import { stringify } from "querystring";
const log4js = require("log4js");

const logger = log4js.getLogger();
logger.level = process.env.LOGGINGLEVEL

let _api: Api = new Api();

let dealers: Object[] = null;
let states: Object[] = null;
let cityAgency: Object[] = null;
let bidItemCodes: Object[] = null;

const swormCfg: any = require("sworm");

export let getPoItemActivity: any = (req: Request, res: Response) => {

  const sworm: any = require("sworm");
  var db = sworm.db(Constants.configSworm);

  let sql: string =
    " Select createdBy, count(*) as count from FsaCppItem where markAsDeleted = " + "'0" + "'" + " and createdBy " +
    " not like " + "'dwilliams%" + "'" + " group by createdBy order by count(*) desc ";

  db.query(sql).then(function (results) {
    if (results) {
      db.close();
      res.send(results);
    }
  });

}

export let getPaymentActivity = (req: Request, res: Response) => {

  const sworm: any = require("sworm");
  var db = sworm.db(Constants.configSworm);

  let sql: string =
    " Select createdBy, count(id) as count from FsaCppPayment  where markAsDeleted = " + "'0" + "'" +
    " and createdBy IS NOT NULL and createdBy NOT LIKE  " + "'dwilliams%" + "'" + " group by createdBy order by count(*) desc";

  logger.debug(sql);
  db.query(sql).then(function (results) {
    if (results) {
      db.close();
      res.send(results);
    }
  });

}

export let getReportActiveBid = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);
  const active: boolean = (req.params.active === "active" ? true : false);

  let sql: string =
    " Select PO.BidNumber, sum(PO.adminFeeDue) adminFee from FsaCppPurchaseOrder PO, BidNumberType BT " +
    " where PO.bidNumber = BT.BidNumber ";

  if (active) {
    sql += " and BT.EndDate >  SYSDATETIME() group by BT.StartDate, PO.bidNumber  " +
      " order by sum(PO.adminFeeDue) desc ";
  } else {
    sql += " and BT.EndDate < SYSDATETIME() group by BT.StartDate, PO.bidNumber  " +
      " order by sum(PO.adminFeeDue) desc ";
  }

  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getTopVendors = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string =
    "Select top 10 dealerName, sum(adminFeeDue) poAmount from FsaCppPurchaseOrder " +
    " where DATEPART(year, dateReported) in (2017,2018,2019) group by dealerName " +
    " order by poAmount desc"


  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getTopAgency = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);
  const VARIOUS = "Various";

  const sql: string =
    " Select top 10 PO.cityAgency, sum(PO.adminFeeDue) adminFeeDue from FsaCppPurchaseOrder PO " +
    " where DATEPART(year, dateReported) in (2017,2018,2019) and cityAgency <> " + "'" + VARIOUS + "'" + " group by PO.cityAgency " +
    " order by adminFeeDue desc ";


  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getPayeeAllocations = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string =
    "Select sum(fsaAlloc) fsaAlloc, sum(facAlloc) facAlloc, sum(ffcaAlloc) ffcaAlloc from FsaCppPayment " +
    " where   DATEPART(year, paymentDate) in  (2017,2018,2019) "


  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getAdminFee = (req: Request, res: Response) => {

  /*
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,x-access-token");
  */
  var validToken = _api.authCheck(req, res);

  /*
  let configSworm = {
    driver: 'mssql',
    config: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    log: true }
} */

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from BidNumberType where bidNumber = @id", { id: req.params.bidNumber }).then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getCAReportStep1 = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string = "Select year,cityAgency, sum(sumFee) adminFee,sum(sumPayment) payment, sum(balance) balance " +
    " from ReportCityAgency where balance > 0 group by pos, year,cityAgency order by year, balance desc, cityAgency "


  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}


export let getCAReportStep2Payments = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const cityAgency: string = req.params.cityAgency;
  const year: string = req.params.year;

  const sql: string = "Select count(*) as paymentCount, po.adminFeeDue as sumFee,   sum(P.paymentAmount) as sumPayment, " +
    "  po.adminFeeDue - sum(P.paymentAmount) as balance, po.poNumber, cityAgency, dealerName, vehicleType, DATEPART(year, PO.dateReported) year " +
    "  from FsaCppPurchaseOrder PO LEFT OUTER JOIN FsaCppPayment P on PO.id = P.fsaCppPurchaseOrderId  where  PO.markAsDeleted = 0  and P.markAsDeleted = 0 " +
    "  and PO.cityAgency = " + "'" + cityAgency + "'" + " and  DATEPART(year, PO.dateReported) = " + year +
    " group by po.poNumber, po.adminFeeDue, cityAgency, dealerName, vehicleType, DATEPART(year, PO.dateReported) ";

  logger.debug(cityAgency);
  logger.debug(year);
  logger.debug(sql);

  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getCAReportStep2NoPayments = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const cityAgency: string = req.params.cityAgency;
  const year: string = req.params.year;
  const markAsDeleted: string = "0";
  /*
   Select po.adminFeeDue as sumFee, 
   0 as sumPayment,
   po.adminFeeDue  as balance ,
  po.poNumber, cityAgency, dealerName, vehicleType, DATEPART(year, PO.dateReported) 
  from 
  FsaCppPurchaseOrder PO
  where 
  PO.markAsDeleted = '0'
  and PO.cityAgency = 'Clearwater, City of'
  and DATEPART(year, PO.dateReported) = 2014
  and PO.id not in (Select fsaCppPurchaseOrderId from FsaCppPayment where markAsDeleted = '0')
  
  
  */

  const sql: string = " Select po.adminFeeDue as sumFee,  0 as sumPayment,  po.adminFeeDue  as balance , po.poNumber, cityAgency, " +
    "  dealerName, vehicleType, DATEPART(year, PO.dateReported) year from FsaCppPurchaseOrder PO where PO.markAsDeleted = " + "'" + markAsDeleted + "'" +
    "  and PO.cityAgency = " + "'" + cityAgency + "'" + " and  DATEPART(year, PO.dateReported) = " + year +
    "  and PO.id not in (Select fsaCppPurchaseOrderId from FsaCppPayment where markAsDeleted = " + "'" + markAsDeleted + "'" + ") " +
    "  order by po.poNumber ";

  logger.debug(cityAgency);
  logger.debug(year);
  logger.debug(sql);

  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}

export let getCAReportStep3 = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string = "Select PO.ponumber, PO.cityAgency, PO.dealerName, PO.adminFeeDue as fee, sum(P.paymentAmount) as payment, " +
    "PO.adminFeeDue - sum(P.paymentAmount) as diff  From FsaCppPurchaseOrder PO,  FsaCppItem I, FsaCppPayment P " +
    "Where PO.id = I.fsaCppPurchaseOrderId  and I.id = P.fsaCppItemId and PO.dealerName = @dealerName " +
    "and DATEPART(year, PO.dateReported) = 2019 group by PO.poNumber, PO.adminFeeDue, PO.cityAgency, PO.dealerName " +
    "having PO.adminFeeDue - sum(P.paymentAmount) > 0 order by PO.adminFeeDue - sum(P.paymentAmount) desc ";

  db.query(sql, { dealerName: req.params.dealerName, year: req.params.year }).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}


export let getStates: any = async (req: Request, res: Response) => {


  if (_api.authCheck(req, res) === "success") {
    const sql: string = "select distinct state from FsaStateCountyCodes order by state";

    if (states === null) {
      let db: any;
      try {
        db = swormCfg.db(Constants.configSworm);
        await db.query(sql).then((results: Object[]) => {
          if (results) {
            states = results;
            res.send(states);
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
      res.send(states);
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getTopVendor = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string = "Select TOP 15  dealerName, sum(PO.adminFeeDue) as POAdminFee from FsaCppPurchaseOrder PO " +
    "where markAsDeleted = 0 and po.dateReported IS  NOT NULL and DATEPART(year, PO.dateReported) = @year " +
    "group by dealerName order by  sum(PO.adminFeeDue) desc ";

  db.query(sql, { year: req.params.year }).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });


}

export let getUnbalancedPo = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string = "Select PO.bidNumber, PO.bidType, PO.poissueDate, PO.cityAgency, PO.dealerName, " +
    " PO.poNumber, PO.poAmount, PO.payCD from FsaPoFinalItemPaymentUnbalanced  PO " +
    "where PO.poFinal = " + "'1" + "'" + " and DATEPART(year, PO.dateReported) = @year ";
  logger.debug(sql);
  db.query(sql, { year: req.params.year }).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });


}


export let getPartnerFees = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const sql: string = "Select year, fsaFee, facFee, ffcaFee from PayeeFeesByYear order by year";
  logger.debug(sql);
  db.query(sql).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });

}


export let getPoPaymentUnbalanced = (req: Request, res: Response) => {

  var sworm = require("sworm");
  var db = sworm.db(Constants.configSworm);

  const final: string = req.params.final;

  const sql: string = "Select * from ReportPoPaymentShort where poFinal = " + final + " order by bidNumber, balance ";

  logger.debug(sql);
  db.query(sql, { year: req.params.year }).then(function (results) {
    if (results)
      db.close();
    res.send(results);
  });


}

export let getBidTypeNumber = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from BidNumberType order by endDate desc").then(function (results) {
      if (results)
        db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
}

export let getDealerBidAssoc = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select D.dealerName from DealershipCodes D, DealerBidAssoc A, BidNumberType B where D.dealerName = A.dealerName " +
      "and B.BidNumber = A.bidNumber and A.bidNumber = @bidNumber order by D.dealerName", { bidNumber: req.params.bidNumber }).then(function (results) {
        if (results)
          db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }
}

export let updateDealer = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    logger.debug(req.body.Id);
    logger.debug(req.body.dealerName);
    logger.debug(req.body.dealerContact);
    logger.debug(req.body.dealerPhone);
    logger.debug(req.body.updatedBy);

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "DealershipCodes" });

    var transaction = table({
      id: req.body.Id, dealerName: req.body.dealerName, dealerContact: req.body.dealerContact,
      dealerPhone: req.body.dealerPhone, updatedBy: req.body.updatedBy
    });

    //Connected
    this.sleep(1000);
    transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let insertDealer = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    logger.debug(req.body.dealerName);
    logger.debug(req.body.dealerContact);
    logger.debug(req.body.dealerPhone);
    logger.debug(req.body.createddBy);

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "DealershipCodes" });

    var transaction = table({
      dealerName: req.body.dealerName, dealerContact: req.body.dealerContact,
      dealerPhone: req.body.dealerPhone, createdBy: req.body.createddBy
    });

    //Connected
    this.sleep(1000);
    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let getAllDealers: any = async (req: Request, res: Response) => {


  if (_api.authCheck(req, res) === "success") {
    const sql: string = "select * from DealershipCodes order by dealerName asc";

    if (dealers === null) {
      let db: any;
      try {
        db = swormCfg.db(Constants.configSworm);
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

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getDealer = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
    const sortVal = req.params.sort;
    let sql: string;
    //  sql = 'select * from DealershipCodes order by dealerName asc';
    sql = "select * from DealershipCodes";

    if (sortVal == "update") {
      //   sql = 'select * from DealershipCodes order by UpdateDate desc';
    } else if (sortVal == "insert") {
      sql = "select * from DealershipCodes order by createDate desc";
    }
    logger.debug(sql);
    db.query(sql).then(function (results) {
      if (results)
        db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
}

export let getAgencyTypeByName = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
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

/*
export let getAgencyType = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from AgencyTypeCodes ").then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}
*/

export let getBidType = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from BidType").then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getCityAgency: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {
    const sql: string = "select C.id, C.cityAgencyContact, C.cityAgencyName, C.cityAgencyContactPhone, " +
      "C.cityAgencyAddress, C.agencyTypeId, C.cityAgencyCounty, " +
      "C.cityAgencyState, A.agencyPayCode, A.agencyName from CityAgencyCodes" +
      " C, AgencyType A where C.agencyTypeId = A.agencyTypeId order by C.cityAgencyName asc";

    if (cityAgency === null) {
      let db: any;
      try {
        db = swormCfg.db(Constants.configSworm);
        await db.query(sql).then((results: Object[]) => {
          if (results) {
            cityAgency = results;
            res.send(cityAgency);
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
      res.send(cityAgency);
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getCityAgencyByName = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select C.cityAgencyName as cityAgencyName, " +
      " C.cityAgencyCounty as county, C.cityAgencyState as state from CityAgencyCodes  C " +
      " where C.cityAgencyName = @name ", { name: req.params.name }).then(function (results) {
        db.close();
        res.send(results);
      });

  } else {
    res.json({ message: "Invalid Token" });
  }

}


export let getItemType = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from FsaCppBidItemCodes where bidNumber = @id and itemNumber = @itemId order by itemMake asc ", { id: req.params.bidId, itemId: req.params.itemId }).then(function (results) {
      db.close();
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let deleteVendor = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("delete from DealershipCodes where Id = @id", { id: req.params.id }).then(function (results) {
      db.close();
      res.json({ message: "Vendor deleted " + req.params.id });
    });

  }

}

export let deleteFeeDistribution = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("delete from AdminFeeDistributionPct where id = @id", { id: req.params.id }).then(function (results) {
      db.close();
      res.json({ message: "Admin Fee deleted " + req.params.id });
    });

  }

}

export let getFeeDistribution = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    //  If no params were passed we wil pass all rows back
    if ((!(req.params.id == null || req.params.id === undefined)) &&
      (req.params.payee == null || req.params.payee === undefined)) {
      db.query("select * from AdminFeeDistributionPct where id = @id", { id: req.params.id }).then(function (results) {
        db.close();
        res.send(results);
      });
    } // If the ID is passed in we will want to edit the row
    else if ((req.params.payee == null || req.params.payee === undefined)) {
      db.query("select * from AdminFeeDistributionPct order by id desc").then(function (results) {
        db.close();
        res.send(results);
      });
    } else {
      db.query("select * from AdminFeeDistributionPct where (retiredDate IS NULL or retiredDate >= SYSDATETIME()) " +
        " and RTRIM(LTRIM(payeePartner)) = @payee and RTRIM(LTRIM(bidType)) = @type and  RTRIM(LTRIM(payCD)) = @payCd", { payee: req.params.payee, type: req.params.type, payCd: req.params.payCd }).then(function (results) {
          db.close();
          res.send(results);
        });
    }

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getItemCodeTypeById = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  // var validToken = 'success';

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from FsaCppBidItemCodes where id = @id", { id: req.params.id }).then(function (results) {
      db.close();
      //  console.log(results);
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getItemTypeByBid = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  // var validToken = 'success';

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);
    logger.debug(req.params.bidId);

    db.query("select distinct itemNumber, itemDescription from FsaCppBidItemCodes where bidNumber = @id", { id: req.params.bidId }).then(function (results) {

      logger.debug(results);
      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let getAllItems: any = async (req: Request, res: Response) => {

  if (_api.authCheck(req, res) === "success") {
    const sql: string = "select * from FsaCppBidItemCodes";

    if (bidItemCodes === null) {
      let db: any;
      try {
        db = swormCfg.db(Constants.configSworm);
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

  } else {
    res.json({ message: "Invalid Token" });
  }

};

export let getAllBids: any = async (req: Request, res: Response) => {

  const validToken: string = _api.authCheck(req, res);

  if (validToken === "success") {
    const sql: string = "select * from BidNumberType order by StartDate desc";
    let db: any;
    try {
      db = swormCfg.db(Constants.configSworm);
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

}

export let getPoStatusType = (req: Request, res: Response) => {

  if (_api.authCheck(req, res) == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("select * from PoStatusType").then(function (results) {


      res.send(results);
    });

  } else {
    res.json({ message: "Invalid Token" });
  }

}

export let insertAdminFeeDistPct = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var adminFeeDistributionPct = db.model({ table: "AdminFeeDistributionPct" });


    let distributionPct: string = req.body.distributionPct.toString();

    // convert to String from Number

    var transaction = adminFeeDistributionPct({
      payeePartner: req.body.payeePartner, bidType: req.body.bidType,
      payCd: req.body.payCd, distributionPct: distributionPct, effectiveDate: req.body.effectiveDate,
      retiredDate: req.body.retiredDate, createdBy: req.body.createdBy
    });

    //Connected
    this.sleep(1000);
    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Inserted " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export let updateAdminFeeDistPct = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var adminFeeDistributionPct = db.model({ table: "AdminFeeDistributionPct" });

    let distributionPct: string = req.body.distributionPct.toString();

    var transaction = adminFeeDistributionPct({
      id: req.body.id, payeePartner: req.body.payeePartner, bidType: req.body.bidType,
      payCd: req.body.payCd, distributionPct: distributionPct, effectiveDate: req.body.effectiveDate,
      retiredDate: req.body.retiredDate, updatedBy: req.body.updatedBy
    });

    //Connected
    this.sleep(1000);
    transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let deleteBid = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  if (validToken == "success") {

    var sworm = require("sworm");
    var db = sworm.db(Constants.configSworm);

    db.query("delete from BidNumberType where Id = @id", { id: req.params.id }).then(function (results) {
      db.close();
      res.json({ message: "Bid deleted " + req.params.id });
    });

  }

}

export let insertBid = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "BidNumberType" });

    let AdminFeeRate: string = req.body.AdminFeeRate.toString();

    var transaction = table({
      BidNumber: req.body.BidNumber, BidType: req.body.BidType,
      BidTitle: req.body.BidTitle, AdminFeeRate: AdminFeeRate, StartDate: req.body.StartDate,
      EndDate: req.body.EndDate, EstimatedCloseoutDate: req.body.EstimatedCloseoutDate,
      ClosedoutDate: req.body.ClosedoutDate, createdBy: req.body.createdBy
    });

    //Connected
    this.sleep(1000);
    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Inserted " });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let updateBid = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);

  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "BidNumberType" });

    let AdminFeeRate: string = req.body.AdminFeeRate.toString();

    var transaction = table({
      id: req.body.id, BidNumber: req.body.BidNumber, BidType: req.body.BidType,
      BidTitle: req.body.BidTitle, AdminFeeRate: AdminFeeRate, StartDate: req.body.StartDate,
      EndDate: req.body.EndDate, EstimatedCloseoutDate: req.body.EstimatedCloseoutDate,
      ClosedoutDate: req.body.ClosedoutDate, updatedBy: req.body.updatedBy
    });

    //Connected
    this.sleep(1000);
    transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Inserted " });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};

export let insertCityAgency = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    logger.debug(req.body.agencyTypeId);
    logger.debug(req.body.cityAgencyName);
    logger.debug(req.body.address);
    logger.debug(req.body.county);
    logger.debug(req.body.state);
    logger.debug(req.body.contact);
    logger.debug(req.body.phone);
    logger.debug(req.body.createdBy);

    var sworm = require("sworm");

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "CityAgencyCodes" });

    var transaction = table({
      agencyTypeId: req.body.agencyTypeId, cityAgencyName: req.body.cityAgencyName,
      cityAgencyAddress: req.body.address, cityAgencyCounty: req.body.county, cityAgencyState: req.body.state,
      cityAgencyContact: req.body.contact, cityAgencyContactPhone: req.body.phone, updatedBy: req.body.createdBy
    });
    transaction.save().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export let updateCityAgency = (req: Request, res: Response) => {

  var validToken = _api.authCheck(req, res);
  logger.debug(validToken);

  if (validToken == "success") {

    var sworm = require("sworm");

    logger.debug(req.body.id);
    logger.debug(req.body.agencyTypeId);
    logger.debug(req.body.cityAgencyName);
    logger.debug(req.body.cityAgencyAddress);
    logger.debug(req.body.cityAgencyCounty);
    logger.debug(req.body.cityAgencyState);
    logger.debug(req.body.cityAgencyContact);
    logger.debug(req.body.cityAgencyContactPhone);
    logger.debug(req.body.updatedBy);

    var db = sworm.db(Constants.configSworm);
    var table = db.model({ table: "CityAgencyCodes" });

    var transaction = table({
      id: req.body.id, agencyTypeId: req.body.agencyTypeId, cityAgencyName: req.body.cityAgencyName,
      cityAgencyAddress: req.body.cityAgencyAddress, cityAgencyCounty: req.body.cityAgencyCounty, cityAgencyState: req.body.cityAgencyState,
      cityAgencyContact: req.body.cityAgencyContact, cityAgencyContactPhone: req.body.cityAgencyContactPhone, updatedBy: req.body.updatedBy
    });

    //Connected
    this.sleep(1000);
    transaction.update().then(function () {
      db.close();
      res.json({ message: "Transaction Updated " + req.body.id });
    });

  } else {
    res.json({ message: "Invalid Token" });
  }
};


export let sleep = (milliseconds: number) => {
  const _sleep = (ms) => {
    const end = +(new Date()) + ms;
    while (+(new Date()) < end) { }
  }

}
