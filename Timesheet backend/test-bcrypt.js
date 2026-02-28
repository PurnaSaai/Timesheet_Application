const bcrypt = require("bcrypt");

const plain = "user123";
const hash = "$2b$10$4oViAIz75yWKe.pyvNAKielPhSMEWjRQIOs7pQQj/FhF4Bf5RK38u";

bcrypt.compare(plain, hash).then(result => {
  console.log("MATCH:", result);
});
