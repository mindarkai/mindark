/**
 * ts-to-zod configuration.
 *
 * @type {import("ts-to-zod").TsToZodConfig}
 */
module.exports = {
  input: process.env['TS_INPUT'],
  output: process.env['TS_OUTPUT'],
  getSchemaName:(name)=>{
    return name.substring(0,1).toUpperCase()+name.substring(1)+'Scheme';
  }
};
