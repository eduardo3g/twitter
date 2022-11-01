const l = require('../lib/log');
const {user_exists_in_UsersTable} = require('./common');
const {a_users_signsup} = require('./common');
const {a_random_user} = require('./common');


async function main() {
    const {name, password, email} = a_random_user();
    const user = await a_users_signsup(password, name, email);
    l.i(user);
    const ddbUser = await user_exists_in_UsersTable(user.username);
    l.i(ddbUser);
}

main().then({}).finally({});
