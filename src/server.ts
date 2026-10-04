import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Food Order Platform API listening on port ${env.PORT}`);
});
