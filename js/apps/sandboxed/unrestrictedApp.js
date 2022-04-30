const code = `
class _Unrestricted {
  constructor() {
    this.params = {...params};
    params = null; //remove sensitive data from window object;
    
    window.location.href = this.params.url;
  }
}

const Unrestricted = new _Unrestricted();
`;


const UnrestrictedApp = {
  name: 'Unrestricted Page',
  code,
}

export default UnrestrictedApp;
