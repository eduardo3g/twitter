const l = require('../lib/log');
const {user_exists_in_UsersTable} = require('./common');
const {a_users_signsup} = require('./common');


async function main() {
    const password = '12345678';
    const name = 'test';
    const email = 'test@facedao.pro';
    const user = await a_users_signsup(password, name, email);
    const ddbUser = await user_exists_in_UsersTable(user.username);
    l.i(ddbUser);
}

main().then({}).finally({});
