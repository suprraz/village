const code = `
const PaymentHtml = \`
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Village Payment Page</title>
    <link rel="stylesheet" href="https://unpkg.com/bulma@0.9.3/css/bulma.min.css">
</head>

<body>
<div id="placeholder" style='background-color: #0a0a0a; height: 100%;'></div>
<div id="payment" style='display: none;'>
    <section class="section">

            <h1 class="title">
                App purchase
            </h1>
            <p id="appName" class="subtitle">
                
            </p>

    </section>

    <section class="hero is-medium is-link">
        <div class="hero-body">
            <section class="container">
                <div id="qrcode"></div>
                <div> <a href="ln://lnbc20n...part8rt">Open Wallet</a> </div>
                <div> 09:58 Timeout </div>
            </section>
        </div>
    </section>

</div>
</body>
\`;

class _Payment {
  constructor() {
    document.getElementsByTagName("html")[0].innerHTML = PaymentHtml;
    
    this.params = {...params};
    params = null; //remove sensitive data from window object;
        
    const link = document.createElement('link');
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("type", "text/css");
    link.onload = () => { 
       //prevent white flash
       const placeholder = document.getElementById('placeholder');
       const payment = document.getElementById('payment');
       payment.removeAttribute('style');
       placeholder.remove();
    };
    link.setAttribute("href", 'https://unpkg.com/bulmaswatch/darkly/bulmaswatch.min.css');
    document.getElementsByTagName("head")[0].appendChild(link);
    
    const s = document.createElement('script');
    s.onload = () => {
      this.start();
    }
    s.setAttribute('src', 'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js');
    document.getElementsByTagName("head")[0].appendChild(s);
  }
  
  async start() {
    const invoice = await this.createInvoice(this.params.paywall);
    
    new QRCode(document.getElementById("qrcode"), invoice.payment_request);
    
    let url = null;
    try {
      const status = await this.waitForPayment(this.params.paywall, invoice);

      url = status.url;
    } catch (e) {
      alert(e.message)
    }
    
    const urlObj = new URL(url);
    const urlParams = new URLSearchParams(urlObj.search);

    if(urlParams.has('encryptionKey') && urlParams.has('appId')) {
      window.parent.postMessage({type: 'closeApp', payload: {sourceApp: 'PaymentApp'}},'*');
      window.parent.postMessage({type: 'invoicePaid', payload: {decryptApp: true, encryptionKey: urlParams.get('encryptionKey'), appId: urlParams.get('appId')}},'*');
    }
  }
  
  
  async createInvoice(paywall) {
    try {
      const res = await fetch('https://legend.lnbits.com/paywall/api/v1/paywalls/invoice/' + paywall.id, {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.params.apiKey
        },
        body: JSON.stringify(
          {
            "amount": paywall.amount,
          }
        ),
        method: "POST"
      });

      const resObj = await res.json();

      return resObj;
    } catch (e) {
      alert("Failed to generate invoice. Please check payment settings.")
    }
  }

  async checkInvoice(paywall, invoice) {
    try {
      const res = await fetch('https://legend.lnbits.com/paywall/api/v1/paywalls/check_invoice/' + paywall.id, {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.params.apiKey
        },
        body: JSON.stringify(
          {
            "payment_hash": invoice.payment_hash,
          }
        ),
        method: "POST"
      });

      const resObj = await res.json();

      return resObj;
    } catch (e) {
      alert("Failed to check invoice. Please check payment settings.")
    }
  }


  async waitForPayment(paywall, invoice) {
    const minutesToAdd = 1;
    const currentDate = new Date();
    const timeoutDate = new Date(currentDate.getTime() + minutesToAdd*60000);

    function wait(ms) {
      return new Promise(resolve => {
        setTimeout(resolve, ms);
      });
    }

    let status = await this.checkInvoice(paywall, invoice)
    while (status.paid !== true) {
      if(timeoutDate < new Date()) {
        throw new Error('Waiting for payment timed out.')
      }
      await wait(1000);
      status = await this.checkInvoice(paywall, invoice)
    }

    return status;
  }
}

const Payment = new _Payment();
`;


const PaymentApp = {
  id: 'paymentAppId',
  name: 'Payment Page',
  code,
}

export default PaymentApp;
