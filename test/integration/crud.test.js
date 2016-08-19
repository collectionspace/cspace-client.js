import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import client from '../../src/client';

chai.use(chaiAsPromised);
chai.should();

const clientConfig = {
  url: 'http://nightly.collectionspace.org:8180',
};

const adminSessionConfig = {
  username: 'admin@core.collectionspace.org',
  password: 'Administrator',
};

const readerSessionConfig = {
  username: 'reader@core.collectionspace.org',
  password: 'reader',
};

describe(`crud operations on ${clientConfig.url}`, function suite() {
  this.timeout(20000);

  const cspace = client(clientConfig);
  const adminSession = cspace.session(adminSessionConfig);
  const readerSession = cspace.session(readerSessionConfig);

  const objectNumber = `TEST.${Date.now()}`;
  const comment = `Created by cspace-client.js ${(new Date()).toISOString()}`;

  let adminLoggedIn = false;
  let readerLoggedIn = false;

  let objectCsid = '';

  it('cannot list records as admin before logging in', function test() {
    return adminSession.read('collectionobjects').should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 401);
  });

  it('cannot list records as reader before logging in', function test() {
    return readerSession.read('collectionobjects').should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 401);
  });

  it('can log in as admin', () =>
    adminSession.login().should.eventually
      .be.fulfilled
      .then(() => {
        adminLoggedIn = true;
      }));

  it('can log in as reader', () =>
    readerSession.login().should.eventually
      .be.fulfilled
      .then(() => {
        readerLoggedIn = true;
      }));

  it('can create an object record as admin', function test() {
    if (!adminLoggedIn) {
      this.skip();
    }

    const config = {
      data: {
        document: {
          '@name': 'collectionobjects',
          'ns2:collectionobjects_common': {
            '@xmlns:ns2': 'http://collectionspace.org/services/collectionobject',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            objectNumber,
            comments: {
              comment,
            },
          },
        },
      },
    };

    return adminSession.create('collectionobjects', config).should.eventually
      .include({ status: 201 })
      .and.have.deep.property('headers.location').that.is.ok
      .then(location => {
        objectCsid = location.substring(location.lastIndexOf('/') + 1);
      });
  });

  it('cannot create an object record as reader', function test() {
    if (!readerLoggedIn) {
      this.skip();
    }

    const config = {
      data: {
        document: {
          '@name': 'collectionobjects',
          'ns2:collectionobjects_common': {
            '@xmlns:ns2': 'http://collectionspace.org/services/collectionobject',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            objectNumber: 'OH.NO',
            comments: {
              comment: 'This should not be created',
            },
          },
        },
      },
    };

    return readerSession.create('collectionobjects', config).should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 403);
  });

  it('can find the record as admin', function test() {
    if (!objectCsid || !adminLoggedIn) {
      this.skip();
    }

    const config = {
      params: {
        pgSz: 5,
        pgNum: 0,
        as: `collectionobjects_common:objectNumber ILIKE "%${objectNumber}%"`,
        wf_deleted: false,
      },
    };

    return adminSession.read('collectionobjects', config).should.eventually
      .include({ status: 200 })
      .and.have.property('data')
        .with.property('ns2:abstract-common-list')
          .with.property('list-item')
            .with.property('csid', objectCsid);
  });

  it('can find the record as reader', function test() {
    if (!objectCsid || !readerLoggedIn) {
      this.skip();
    }

    const config = {
      params: {
        pgSz: 5,
        pgNum: 0,
        as: `collectionobjects_common:objectNumber ILIKE "%${objectNumber}%"`,
        wf_deleted: false,
      },
    };

    return readerSession.read('collectionobjects', config).should.eventually
      .include({ status: 200 })
      .and.have.property('data')
        .with.property('ns2:abstract-common-list')
          .with.property('list-item')
            .with.property('csid', objectCsid);
  });

  it('can read the record as admin', function test() {
    if (!objectCsid || !adminLoggedIn) {
      this.skip();
    }

    return adminSession.read(`collectionobjects/${objectCsid}`).should.eventually
      .include({ status: 200 })
      .and.have.property('data')
        .with.property('document')
          .with.property('ns2:collectionobjects_common')
            .that.includes({ objectNumber })
            .and.has.property('comments')
              .with.property('comment', comment);
  });

  it('can read the record as reader', function test() {
    if (!objectCsid || !readerLoggedIn) {
      this.skip();
    }

    return readerSession.read(`collectionobjects/${objectCsid}`).should.eventually
      .include({ status: 200 })
      .and.have.property('data')
        .with.property('document')
          .with.property('ns2:collectionobjects_common')
            .that.includes({ objectNumber })
            .and.has.property('comments')
              .with.property('comment', comment);
  });

  it('can update the record as admin', function test() {
    if (!objectCsid || !adminLoggedIn) {
      this.skip();
    }

    const commentUpdate = `Updated at ${Date.now()}`;

    const config = {
      data: {
        document: {
          '@name': 'collectionobjects',
          'ns2:collectionobjects_common': {
            '@xmlns:ns2': 'http://collectionspace.org/services/collectionobject',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            comments: {
              comment: commentUpdate,
            },
          },
        },
      },
    };

    return adminSession.update(`collectionobjects/${objectCsid}`, config).should.eventually
      .include({ status: 200 })
      .and.have.property('data')
        .with.property('document')
          .with.property('ns2:collectionobjects_common')
            .that.includes({ objectNumber })
            .and.has.property('comments')
              .with.property('comment', commentUpdate);
  });

  it('cannot update the record as reader', function test() {
    if (!objectCsid || !readerLoggedIn) {
      this.skip();
    }

    const config = {
      data: {
        document: {
          '@name': 'collectionobjects',
          'ns2:collectionobjects_common': {
            '@xmlns:ns2': 'http://collectionspace.org/services/collectionobject',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            comments: {
              comment: 'This should not be updated',
            },
          },
        },
      },
    };

    return readerSession.update(`collectionobjects/${objectCsid}`, config).should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 403);
  });


  it('can delete the record as admin', function test() {
    if (!objectCsid || !adminLoggedIn) {
      this.skip();
    }

    return adminSession.delete(`collectionobjects/${objectCsid}`).should.eventually
      .include({ status: 200 });
  });

  it('can delete the record as reader', function test() {
    if (!objectCsid || !readerLoggedIn) {
      this.skip();
    }

    return readerSession.delete(`collectionobjects/${objectCsid}`).should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 403);
  });

  it('can log out as admin', () =>
    adminSession.logout().should.eventually
      .be.fulfilled);

  it('cannot list records as admin after logging out', function test() {
    return adminSession.read('collectionobjects').should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 401);
  });

  it('can list records as reader after logging out as admin', function test() {
    return readerSession.read('collectionobjects').should.eventually
      .be.fulfilled;
  });

  it('can log out as reader', () =>
    readerSession.logout().should.eventually
      .be.fulfilled);

  it('cannot list records as reader after logging out', function test() {
    return readerSession.read('collectionobjects').should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 401);
  });

  it('cannot log in a second time in the same session', () =>
    readerSession.login().should.eventually
      .be.rejected
      .and.have.deep.property('response.status', 400));
});
