/// <reference path="../typings/index.d.ts" />
import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as morgan from "morgan";
import * as dotenv from "dotenv";

import * as fsaPurchaseOrder from "./controllers/fsaPurchaseOrder";
import * as fsaRepoorting from "./controllers/reportServices";
import * as fsapayments from "./controllers/fsaPayment";
import * as fsaItem from "./controllers/fsaItem";
import * as fsaCodeServices from "./controllers/fsaCodeServices";
import * as fsaUserServices from "./controllers/fsaUser";
import * as fsaCppImportServices from "./controllers/fsaImportServices";
import * as fsaVendorFine from "./controllers/fsaVendorFines";
import { Constants } from "./utils/constants";
const log4js = require("log4js");

const logger = log4js.getLogger();
logger.level = process.env.LOGGINGLEVEL
let app: any = null;

/* ===============
// Express App
// ===============
*/
try {
    
let app: any  = express();
const port: any = process.env.PORT

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(morgan("common")); // log requests to the console 1

//Import URI
app.get("/api/import/list/:tableName",  fsaCppImportServices.getImportRowsByTableName);
app.get("/api/import/delete/:importHash",  fsaCppImportServices.deleteBatchImport);


// reporting URI
app.get("/api/report/topvendor/:year",  fsaRepoorting.getTopVendor);
app.get("/api/report/final-unbalalnced/:year", fsaRepoorting.getUnbalancedPo);
app.get("/api/report/po-payment-unbalalnced/:final", fsaRepoorting.getPoPaymentUnbalanced);
app.get("/api/report/partnerFees/", fsaRepoorting.getPartnerFees);
app.get("/api/report/partnerAllocations/", fsaRepoorting.getPayeeAllocations);
app.get("/api/report/topvendor/", fsaRepoorting.getTopVendors);
app.get("/api/report/topagency/", fsaRepoorting.getTopAgency);
app.get("/api/report/activeBid/:active", fsaRepoorting.getReportActiveBid);

app.get("/api/report/PoItemActivity", fsaRepoorting.getPoItemActivity);
app.get("/api/report/paymentActivity", fsaRepoorting.getPaymentActivity);


app.get("/api/report/caReport/", fsaRepoorting.getCAReportStep1);
app.get("/api/report/caReport/2/:cityAgency/:year", fsaRepoorting.getCAReportStep2Payments);
app.get("/api/report/caReport/3/:cityAgency/:year", fsaRepoorting.getCAReportStep2NoPayments);


// vendorFines
app.get("/api/vendor/fine/payment/:id", fsaVendorFine.getVendorFinePayments)
app.put("/api/vendor/fine/payment/:id", fsaVendorFine.updateFinePayment);
app.get("/api/vendor/fine/payment/delete/:id", fsaVendorFine.deleteFinePayment);
app.post("/api/vendor/fine/payment", fsaVendorFine.insertFinePayment);
app.get("/api/vendor/fine", fsaVendorFine.getAllVendorFines);
app.put("/api/vendor/fine/:id", fsaVendorFine.updateFine)
app.get("/api/vendor/fine/:id", fsaVendorFine.getVendorFine)
app.post("/api/vendor/fine", fsaVendorFine.insertFine)
app.delete("/api/vendor/fine/delete/:id", fsaVendorFine.deleteFine);


// purchaseOrder services

/* Search by CheckNumber  */
app.get("/api/transaction/bid/view/check/:checkNumber/vendor/:vendor/paydate/:paydate", fsaPurchaseOrder.getTransactionPaymentByCheckNumVendorPaymentDt);
//app.get("/api/transaction/bid/view/check/:checkNumber/vendor/:vendor", fsaPurchaseOrder.getTransactionPaymentByCheckNumVendor);
//app.get("/api/transaction/bid/view/vendor/:vendor", fsaPurchaseOrder.getTransactionPaymentByVendor);
app.get("/api/transaction/bid/view/:checkNumber", fsaPurchaseOrder.getTransactionPaymentByBidNumber);
app.get("/api/transaction/bid/view/list/:checkNumber/:dealerName", fsaPurchaseOrder.getTransactionPaymentDetailsByBidNumber);
app.get("/api/transaction/bid/view/detail/:id", fsaPurchaseOrder.getTransactionPaymentById);
app.get("/api/transaction/check/delete/:checkNumber/:dealerName", fsaPurchaseOrder.deletePaymentsByCheck);
app.get("/api/transaction/check/lock/:checkNumber/:dealerName", fsaPurchaseOrder.lockPaymentsByCheck);
app.get("/api/transaction/check/unlock/:checkNumber/:dealerName", fsaPurchaseOrder.unLockPaymentsByCheck);
app.get("/api/transaction/check/lock/dt/:startDate/:endDate/:createdBy", fsaPurchaseOrder.lockPaymentsByDate);
app.get("/api/transaction/check/unlock/dt/:startDate/:endDate", fsaPurchaseOrder.unLockPaymentsByDate);
app.get("/api/transaction/check/unlock/all/:startDate/:endDate", fsaPurchaseOrder.getLockedPaymentsByDate);
app.get("/api/transaction/check/verify/:checkNumber/:dealerName", fsaPurchaseOrder.verifyPaymentsByCheckVendor);
app.get("/api/transaction/check/resetverify/:checkNumber/:dealerName", fsaPurchaseOrder.resetVerifyPaymentsByCheckVendor);

app.get("/api/transaction/check/verify/dt/:startDate/:endDate", fsaPurchaseOrder.verifyPaymentsByDate);
app.get("/api/transaction/check/unverify/dt/:startDate/:endDate", fsaPurchaseOrder.unVerifyPaymentsByDate);
app.get("/api/transaction/check/verify/all/:startDate/:endDate", fsaPurchaseOrder.getVerifyPaymentsByDate);



// transaction.  This is the main table FSACppReport
app.put("/api/transaction/bids", fsaCodeServices.updateBid);
app.post("/api/transaction/bids", fsaCodeServices.insertBid);
app.post("/api/transaction/bidItemCode", fsaCodeServices.insertBidItemCode);
app.get("/api/transaction/bidItemCode/delete/:id", fsaCodeServices.deleteBidItem);
app.get("/api/transaction/bids/delete/:id", fsaCodeServices.deleteBid);
app.get("/api/transaction/bids", fsaCodeServices.getAllBids);
app.get("/api/transaction/bid/:bidNumber", fsaPurchaseOrder.getTransactionByBidNumber);
app.get("/api/transaction/bid/po/:poNumber", fsaPurchaseOrder.getTransactionByPoNumber);

app.get("/api/transaction/bid/:bidNumber/:status", fsaPurchaseOrder.searchTransactionsFilter);
app.get("/api/transaction/:transId", fsaPurchaseOrder.getTransaction);
app.get("/api/transaction/verifyPayment/:transId", fsaPurchaseOrder.verifyTransactionHasPayment);
app.get("/api/transaction/po/:poNumber", fsaPurchaseOrder.getTransactionByPoNumber);
app.get("/api/transaction/bid/po/status/:poStatus/:bidNumber", fsaPurchaseOrder.getTransactionByPoStatus);

app.get("/api/transaction/payment/lockedpaymentlist", fsapayments.getLockedPaymentList);
app.get("/api/transaction/payment/lockdates", fsapayments.getLockedPaymentDates);
app.get("/api/transaction/payment/delete/:id", fsapayments.deletePayment);
app.get("/api/transaction/payment/:itemId", fsapayments.getPaymentsByItemId);
app.put("/api/transaction/payment/:id", fsapayments.updatePayment);
app.post("/api/transaction/payment", fsapayments.insertPayment);
app.post("/api/transaction", fsaPurchaseOrder.insertTransaction);
app.put("/api/transaction", fsaPurchaseOrder.updateTransaction);
app.get("/api/transaction/delete/:id", fsaPurchaseOrder.deletePurchaseOrder);

// items
app.get("/api/item/purchaseOrder/:fsaPurchaseOrderId", fsaItem.getPoItem);
app.get("/api/item/:itemId", fsaItem.getItem);
app.get("/api/item/verifyPayment/:itemId", fsaItem.verifyItemHasPayment);
app.get("/api/item/sum/:poId", fsaItem.getItemAmountByPoId);
app.get("/api/item/delete/:itemId/:updatedBy", fsaItem.deleteItem);
// app.get("/api/item/delete/:itemId", fsaItem.deleteItem);
app.get("/api/item/delete/po/:poId", fsaItem.deleteItemsByPo);

app.get("/api/item/derived/:bidNumber/:itemNumber/:itemType", fsaItem.getDerivedItem);
app.post("/api/item", fsaItem.insertItem);
app.put("/api/item", fsaItem.updateItem);

// user services
// app.put("/api/user/:loginId", apiController.putUser);
app.get("/api/user/", fsaUserServices.getUsers);
app.get("/api/user/roles/:userLogin", fsaUserServices.getRoles);
app.get("/api/user/delete/:id", fsaUserServices.deleteUser);
app.post("/api/user/", fsaUserServices.postUser);
app.put("/api/user/:loginId", fsaUserServices.putUser);
app.get("/api/user/:loginId", fsaUserServices.getUser);

// login auth
app.post("/authenticate", fsaUserServices.authenticate);

// code Tables
app.put("/api/biditemcodes/", fsaCodeServices.updateBidItem);
app.get("/api/item/", fsaCodeServices.getAllItems);
app.get("/api/item/id/:id", fsaCodeServices.getItemCodeTypeById);
app.get("/api/item/bid/:bidId", fsaCodeServices.getItemTypeByBid);
app.get("/api/item/:bidId/:itemId", fsaCodeServices.getItemType);
app.get("/api/fee/:payee/:type/:payCd", fsaCodeServices.getFeeDistribution);
app.get("/api/fee/delete/:id", fsaCodeServices.deleteFeeDistribution);
app.get("/api/fee/:id", fsaCodeServices.getFeeDistribution);
app.get("/api/fee/", fsaCodeServices.getFeeDistribution);
app.put("/api/fee/", fsaCodeServices.updateAdminFeeDistPct);
app.post("/api/fee/", fsaCodeServices.insertAdminFeeDistPct);


app.get("/api/state/", fsaCodeServices.getStates);
app.get("/api/county/:state", fsaCodeServices.getCounties);

app.get("/api/poStatusType/", fsaCodeServices.getPoStatusType);
app.get("/api/agencyType/", fsaCodeServices.getAgencyType);
app.get("/api/agencyType/:agencyName", fsaCodeServices.getAgencyTypeByName);
app.get("/api/bidType/", fsaCodeServices.getBidType);
app.get("/api/bidType/:bidNumber", fsaCodeServices.getAdminFee);
app.get("/api/cityAgency/", fsaCodeServices.getCityAgency);
app.get("/api/cityAgency/delete/:id", fsaCodeServices.deleteAgency);
app.put("/api/cityAgency/", fsaCodeServices.updateCityAgency);
app.post("/api/cityAgency/", fsaCodeServices.insertCityAgency);
app.get("/api/cityAgency/:name", fsaCodeServices.getCityAgencyByName);
app.get("/api/dealer/:sort", fsaCodeServices.getDealer);
app.put("/api/dealer/", fsaCodeServices.updateDealer);
app.post("/api/dealer/", fsaCodeServices.insertDealer);
app.get("/api/dealer/delete/:id", fsaCodeServices.deleteVendor);
app.get("/api/dealer/", fsaCodeServices.getAllDealers);
app.get("/api/dealer/assoc/delete/:id", fsaCodeServices.deleteVendorAssocBid);
app.post("/api/dealer/assoc/delete/:id", fsaCodeServices.deleteVendorAssocBid);
app.get("/api/dealer/assoc/:bidNumber", fsaCodeServices.getDealerBidAssoc);
app.get("/api/dealer/assoc/dealer/:dealerName", fsaCodeServices.getBidAssocByDealer);
app.get("/api/dealer/assoc/dealer/avail/:dealerName", fsaCodeServices.getAvailableBidsByDealer);
app.get("/api/dealer/assoc/:included/:vendor", fsaCodeServices.getVendorAssocBids);
app.post("/api/dealer/assoc/", fsaCodeServices.insertVendorContractAssoc);
app.get("/api/dealer/assoc/delete/:bidNumber/:dealerName", fsaCodeServices.deleteVendorAssocBid);
app.get("/api/bidNumberType/", fsaCodeServices.getBidTypeNumber);
app.get("/api/vehicleType/:bidId/:itemId", fsaCodeServices.getItemType);
app.get("/api/content/:contentName", fsaUserServices.getHomeContentByName);

app.post("/api/import/", fsaCodeServices.insertImport);
app.get("/api/import/", fsaCodeServices.getImports);


// dashboard rest graphs

app.set("port", port);
logger.info("Database Connected to: " + Constants.configSworm.config.database);
app.listen(port, () => logger.info("FSA CPP Service version: " + Constants.version + "  Build Date: " + Constants.buildDate + "  Running on  port: " + port));

} 
catch(e) {logger.error(e);
}