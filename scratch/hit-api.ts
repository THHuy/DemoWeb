import http from "http";

async function makeRequest(options: http.RequestOptions, postData?: string): Promise<{ headers: any; body: string; statusCode?: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function test() {
  try {
    console.log("Logging in to get access token...");
    const loginData = JSON.stringify({
      username: "admin",
      password: "admin123",
    });

    const loginRes = await makeRequest({
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginData),
      },
    }, loginData);

    console.log("Login Status:", loginRes.statusCode);
    const cookies = loginRes.headers["set-cookie"];
    console.log("Set-Cookie:", cookies);

    if (!cookies || cookies.length === 0) {
      console.error("No cookies received!");
      return;
    }

    const tokenCookie = cookies.find((c: string) => c.startsWith("access_token="));
    if (!tokenCookie) {
      console.error("Access token cookie not found!");
      return;
    }

    const cookieHeader = tokenCookie.split(";")[0];
    console.log("Cookie Header:", cookieHeader);

    console.log("\nFetching /api/pos/orders...");
    const ordersRes = await makeRequest({
      hostname: "localhost",
      port: 3000,
      path: "/api/pos/orders",
      method: "GET",
      headers: {
        "Cookie": cookieHeader,
      },
    });

    console.log("Orders Status:", ordersRes.statusCode);
    console.log("Orders Response Headers:", ordersRes.headers);
    console.log("Orders Response Body:", ordersRes.body);

  } catch (err) {
    console.error("Error during test:", err);
  }
}

test();
