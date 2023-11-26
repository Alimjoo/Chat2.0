import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../config/server";
import { DEFAULT_MODELS, OPENAI_BASE_URL } from "../constant";
import { collectModelTable } from "../utils/model";
import { makeAzurePath } from "../azure";
import { apiUrl , MY_DEFAULT_NAME} from "../constant";

const serverConfig = getServerSideConfig();

export async function get_remaining_word_count(
  name: string,
  model: string,
): Promise<string> {
  const apiUrll = apiUrl + `get_remain_subs/${name}`;

  try {
    const response = await fetch(apiUrll);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const message = data.message;

    if (model == "gpt-4") {
      return message[1];
    } else {
      return message[0];
    }

    return message;
  } catch (error) {
    console.error("Error:", error);
    throw error; // Rethrow the error to handle it further, if needed
  }
}

export async function checkReadWrite(url: string, method: string): Promise<boolean> {
  const newValue = 0;
  const model = 'gpt-3.5-turbo';
  // var response;
  try {
    if (method == 'GET'){
       const response = await fetch(url + '/' + MY_DEFAULT_NAME, {
        method: "GET",
        // You can add other headers or request options here if needed
      });
      return response.ok;
    }else{
      console.log(url);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ MY_DEFAULT_NAME, newValue, model }),
      });
      console.log(response.ok);
      return response.ok;
    }
    
    // Check if the response status is in the range 200-299
    return false;
  } catch (error) {
    console.error('Error checking URL availability:', error);
    return false;
  }
}

export async function requestOpenai(req: NextRequest, accessCode:string) {
  const controller = new AbortController();

  const authValue = req.headers.get("Authorization") ?? "";
  const authHeaderName = serverConfig.isAzure ? "api-key" : "Authorization";

  let path = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/openai/",
    "",
  );

  let baseUrl =
    serverConfig.azureUrl || serverConfig.baseUrl || OPENAI_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);
  console.log("[Org ID]", serverConfig.openaiOrgId);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  if (serverConfig.isAzure) {
    if (!serverConfig.azureApiVersion) {
      return NextResponse.json({
        error: true,
        message: `missing AZURE_API_VERSION in server env vars`,
      });
    }
    path = makeAzurePath(path, serverConfig.azureApiVersion);
  }

  const fetchUrl = `${baseUrl}/${path}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      [authHeaderName]: authValue,
      ...(serverConfig.openaiOrgId && {
        "OpenAI-Organization": serverConfig.openaiOrgId,
      }),
    },
    method: req.method,
    body: req.body,
    // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  let model = "";
  if (req.body) {
    try {
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody);

      if ((jsonBody?.model ?? "").includes("gpt-4")) {
        model = "gpt-4";
      } else {
        model = "gpt-3.5-turbo";
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
  
  const num = await get_remaining_word_count(accessCode, model);
  if (Number(num) <= 0) {
    return NextResponse.json(
      {
        error: true,
        message: model + " 的字数已用完",
        contect: "联系 微信:Pistallion, 进行充值",
      },
      {
        status: 403,
      },
    );
  }

  console.log(model + ' ' + accessCode + ' ' + num);

  const test_get = apiUrl + "get_remain_subs";
  // const test_post = apiUrl + "update_subs"

  const can_get = await checkReadWrite(test_get, 'GET');
  // const can_post = await checkReadWrite(test_post, 'POST');

  if (!can_get){
    return NextResponse.json(
      {
        error: true,
        message: "用户环境错误"
      }
    );
  }


  // #1815 try to refuse gpt4 request
  if (serverConfig.customModels && req.body) {
    try {
      const modelTable = collectModelTable(
        DEFAULT_MODELS,
        serverConfig.customModels,
      );
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody) as { model?: string };

      // not undefined and is false
      if (modelTable[jsonBody?.model ?? ""].available === false) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody?.model} model`,
          },
          {
            status: 403,
          },
        );
      }
    } catch (e) {
      console.error("[OpenAI] gpt4 filter", e);
    }
  }

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
