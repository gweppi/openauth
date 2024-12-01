import { authorizer } from "@openauthjs/core";
import { MemoryStorage } from "@openauthjs/core/storage/memory";
import { TwitchAdapter } from "@openauthjs/core/adapter/twitch";
import { GoogleOidcAdapter } from "@openauthjs/core/adapter/google";
import { PasswordAdapter } from "@openauthjs/core/adapter/password";
import { PasswordUI } from "@openauthjs/core/ui/password";
import { subjects } from "../subjects.js";
import { CodeAdapter } from "@openauthjs/core/adapter/code";
import { CodeUI } from "@openauthjs/core/ui/code";

export default authorizer({
  subjects,
  storage: MemoryStorage({
    persist: "./persist.json",
  }),
  providers: {
    twitch: TwitchAdapter({
      clientID: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      scopes: ["user_read", "user:read:email"],
    }),
    password: PasswordAdapter(
      PasswordUI({
        sendCode: async (email, code) => {
          console.log(email, code);
        },
      }),
    ),
    code: CodeAdapter<{ email: string }>(
      CodeUI({
        sendCode: async (code, claims) => {
          console.log(code, claims);
        },
      }),
    ),
    google: GoogleOidcAdapter({
      clientID:
        "43908644348-ficcruqi5btsf2kgt3bjgvqveemh103m.apps.googleusercontent.com",
    }),
  },
  allow: async () => true,
  success: async (ctx, value) => {
    if (value.provider === "twitch") {
      const response = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          Authorization: `Bearer ${value.tokenset.access}`,
          "Client-Id": value.clientID,
          "Content-Type": "application/json",
        },
      }).then((r) => r.json() as any);
      return ctx.session("user", {
        email: response.data[0].email,
      });
    }

    if (value.provider === "password") {
      return ctx.session("user", {
        email: value.email,
      });
    }

    if (value.provider === "google" && value.id.email_verified) {
      return ctx.session("user", {
        email: value.id.email as string,
      });
    }
    return Response.json(value);
  },
});