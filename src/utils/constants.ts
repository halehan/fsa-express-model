import * as dotenv from "dotenv"; 

const result: any = dotenv.config()
const sworm: any = require("sworm");

  if (result.error) {
    throw result.error
  }
   
 // console.log(result.parsed)
 // console.log(process.env.DB_HOST)

export class Constants {

   // static readonly DATE_FMT = 'dd/MMM/yyyy';
    static readonly DATE_FMT = "MMM-dd-yyyy";
    static readonly DATE_TIME_FMT = `${Constants.DATE_FMT} hh:mm:ss a`;

    static readonly SERVER_URL = "";

    static readonly FACEBOOK_VERIFY_TOKEN = "";
    static readonly FACEBOOK_PAGE_VERIFY_TOKEN = "";

    static readonly GOOGLE_API_KEY = "";
    static readonly version = "2.0.23";
    static readonly  buildDate =  "10/04/2021 08:11:22";

    static readonly REPLY_MESSAGE = "We have recived your message and have added the request to our queue.  Please standby for a law enforcement representative to respond." + 
    "\n\n If you would like to share your location that may help us find you in the event that this is applicable.\n\n" +
    "Your Message: \n";

    static readonly credentials = {
      email: "",
      password: "",
      superSecret: "dog"
    };


    static readonly configSworm = {
      driver: "mssql",
      config: {
       user: process.env.DB_USER,
       password: process.env.DB_PASSWORD,
       server: process.env.DB_HOST,
       database: process.env.DB_NAME,
       log: true,
       pool: {
        max: 10,
        min: 5,
        idleTimeoutMillis: 5000000
      }  
    }
  };

  static async getDbConnection() {
    return sworm.db(this.configSworm);
    }
  
  }