import * as tracer from "tracer";

export const logger = tracer.colorConsole({
  format: "{{timestamp}} {{title}} {{file}}:{{line}}: {{message}}",
  dateformat: "yyyy-mm-dd'T'HH:MM:ss:l",
});
