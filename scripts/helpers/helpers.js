const branch = require('git-branch');
const assert = require('assert');

const branchToSlug = {
    "develop" : "hord-test",
    "staging" : "hord-staging",
    "master" : "hord-prod",
}

const generateTenderlySlug = () => {
    let gitBranch = branch.sync();
    return branchToSlug[gitBranch];
}

const checksumNetworkAndBranch = (network) => {
    const gitBranch = branch.sync();
    if(network === 'ropsten') {
        assert.strictEqual(gitBranch ,'develop','Wrong branch');
    }
    else if(network === 'ropstenStaging') {
        assert.strictEqual(gitBranch ,'staging','Wrong branch');
    }
    else if(network === 'mainnet') {
        assert.strictEqual(gitBranch ,'master','Wrong branch');
    }
    else if(network === 'bscTestnet') {
        assert.strictEqual(gitBranch ,'develop','Wrong branch');
    }
    else if(network === 'bscTestnetStaging'){
        assert.strictEqual(gitBranch ,'staging','Wrong branch');
    }
    else if(network === 'bscMainnetStaging'){
        assert.strictEqual(gitBranch ,'staging','Wrong branch');
    }
    else if(network === 'bscMainnet') {
        assert.strictEqual(gitBranch ,'master','Wrong branch');
    } else {
        new Error('Wrong network configuration')
    }
};


const toCamel = (s) => {
    return s.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
};

module.exports = {
    branchToSlug,
    generateTenderlySlug,
    checksumNetworkAndBranch,
    toCamel
}
