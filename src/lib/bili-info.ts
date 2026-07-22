import z from 'zod';
import { kyi } from './ky';

const BiliApiInfoSchema: z.ZodObject<{
    code: z.ZodNumber;
    message: z.ZodString;
    ttl: z.ZodNumber;
    data: z.ZodObject<{
        card: z.ZodObject<{
            mid: z.ZodString;
            approve: z.ZodBoolean;
            name: z.ZodString;
            sex: z.ZodString;
            face: z.ZodString;
            DisplayRank: z.ZodString;
            regtime: z.ZodNumber;
            spacesta: z.ZodNumber;
            birthday: z.ZodString;
            place: z.ZodString;
            description: z.ZodString;
            article: z.ZodNumber;
            attentions: z.ZodArray<z.ZodUnknown>;
            fans: z.ZodNumber;
            friend: z.ZodNumber;
            attention: z.ZodNumber;
            sign: z.ZodString;
            level_info: z.ZodObject<{
                current_level: z.ZodNumber;
                current_min: z.ZodNumber;
                current_exp: z.ZodNumber;
                next_exp: z.ZodNumber;
            }, z.core.$strip>;
            pendant: z.ZodObject<{
                pid: z.ZodNumber;
                name: z.ZodString;
                image: z.ZodString;
                expire: z.ZodNumber;
                image_enhance: z.ZodOptional<z.ZodString>;
                image_enhance_frame: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            nameplate: z.ZodObject<{
                nid: z.ZodNumber;
                name: z.ZodString;
                image: z.ZodString;
                image_small: z.ZodString;
                level: z.ZodString;
                condition: z.ZodString;
            }, z.core.$strip>;
            Official: z.ZodObject<{
                role: z.ZodNumber;
                title: z.ZodString;
                desc: z.ZodString;
                type: z.ZodNumber;
            }, z.core.$strip>;
            official_verify: z.ZodObject<{
                type: z.ZodNumber;
                desc: z.ZodString;
            }, z.core.$strip>;
            vip: z.ZodObject<{
                vipType: z.ZodNumber;
                vipStatus: z.ZodNumber;
                theme_type: z.ZodNumber;
                dueRemark: z.ZodOptional<z.ZodString>;
                accessStatus: z.ZodOptional<z.ZodNumber>;
                vipStatusWarn: z.ZodOptional<z.ZodString>;
                type: z.ZodNumber;
                status: z.ZodNumber;
                due_date: z.ZodOptional<z.ZodNumber>;
                vip_pay_type: z.ZodOptional<z.ZodNumber>;
                label: z.ZodOptional<z.ZodObject<{
                    path: z.ZodString;
                    text: z.ZodString;
                    label_theme: z.ZodString;
                    text_color: z.ZodString;
                    bg_style: z.ZodNumber;
                    bg_color: z.ZodString;
                    border_color: z.ZodString;
                }, z.core.$strip>>;
                avatar_subscript: z.ZodOptional<z.ZodNumber>;
                nickname_color: z.ZodOptional<z.ZodString>;
                role: z.ZodOptional<z.ZodNumber>;
                avatar_subscript_url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
            space: z.ZodOptional<z.ZodObject<{
                s_img: z.ZodString;
                l_img: z.ZodString;
            }, z.core.$strip>>;
            rank: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        following: z.ZodBoolean;
        archive_count: z.ZodNumber;
        article_count: z.ZodNumber;
        follower: z.ZodNumber;
        like_num: z.ZodNumber;
        space: z.ZodOptional<z.ZodObject<{
            s_img: z.ZodString;
            l_img: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}> = z.object({
  code: z.number(),
  message: z.string(),
  ttl: z.number(),
  data: z.object({
    card: z.object({
      mid: z.string(),
      approve: z.boolean(),
      name: z.string(),
      sex: z.string(),
      face: z.string(),
      DisplayRank: z.string(),
      regtime: z.number(),
      spacesta: z.number(),
      birthday: z.string(),
      place: z.string(),
      description: z.string(),
      article: z.number(),
      attentions: z.array(z.unknown()),
      fans: z.number(),
      friend: z.number(),
      attention: z.number(),
      sign: z.string(),
      level_info: z.object({
        current_level: z.number(),
        current_min: z.number(),
        current_exp: z.number(),
        next_exp: z.number(),
      }),
      pendant: z.object({
        pid: z.number(),
        name: z.string(),
        image: z.string(),
        expire: z.number(),
        image_enhance: z.string().optional(),
        image_enhance_frame: z.string().optional(),
      }),
      nameplate: z.object({
        nid: z.number(),
        name: z.string(),
        image: z.string(),
        image_small: z.string(),
        level: z.string(),
        condition: z.string(),
      }),
      Official: z.object({
        role: z.number(),
        title: z.string(),
        desc: z.string(),
        type: z.number(),
      }),
      official_verify: z.object({
        type: z.number(),
        desc: z.string(),
      }),
      vip: z.object({
        vipType: z.number(),
        vipStatus: z.number(),
        theme_type: z.number(),
        dueRemark: z.string().optional(),
        accessStatus: z.number().optional(),
        vipStatusWarn: z.string().optional(),
        type: z.number(),
        status: z.number(),
        due_date: z.number().optional(),
        vip_pay_type: z.number().optional(),
        label: z
          .object({
            path: z.string(),
            text: z.string(),
            label_theme: z.string(),
            text_color: z.string(),
            bg_style: z.number(),
            bg_color: z.string(),
            border_color: z.string(),
          })
          .optional(),
        avatar_subscript: z.number().optional(),
        nickname_color: z.string().optional(),
        role: z.number().optional(),
        avatar_subscript_url: z.string().optional(),
      }),
      space: z
        .object({
          s_img: z.string(),
          l_img: z.string(),
        })
        .optional(),
      rank: z.string().optional(),
    }),
    following: z.boolean(),
    archive_count: z.number(),
    article_count: z.number(),
    follower: z.number(),
    like_num: z.number(),
    space: z
      .object({
        s_img: z.string(),
        l_img: z.string(),
      })
      .optional(),
  }),
});

export type BiliApiInfo = z.infer<typeof BiliApiInfoSchema>;

export async function BiliInfo(mid: bigint, photo?: boolean): Promise<{
    code: number;
    message: string;
    ttl: number;
    data: {
        card: {
            mid: string;
            approve: boolean;
            name: string;
            sex: string;
            face: string;
            DisplayRank: string;
            regtime: number;
            spacesta: number;
            birthday: string;
            place: string;
            description: string;
            article: number;
            attentions: unknown[];
            fans: number;
            friend: number;
            attention: number;
            sign: string;
            level_info: {
                current_level: number;
                current_min: number;
                current_exp: number;
                next_exp: number;
            };
            pendant: {
                pid: number;
                name: string;
                image: string;
                expire: number;
                image_enhance?: string | undefined;
                image_enhance_frame?: string | undefined;
            };
            nameplate: {
                nid: number;
                name: string;
                image: string;
                image_small: string;
                level: string;
                condition: string;
            };
            Official: {
                role: number;
                title: string;
                desc: string;
                type: number;
            };
            official_verify: {
                type: number;
                desc: string;
            };
            vip: {
                vipType: number;
                vipStatus: number;
                theme_type: number;
                dueRemark?: string | undefined;
                accessStatus?: number | undefined;
                vipStatusWarn?: string | undefined;
                type: number;
                status: number;
                due_date?: number | undefined;
                vip_pay_type?: number | undefined;
                label?: {
                    path: string;
                    text: string;
                    label_theme: string;
                    text_color: string;
                    bg_style: number;
                    bg_color: string;
                    border_color: string;
                } | undefined;
                avatar_subscript?: number | undefined;
                nickname_color?: string | undefined;
                role?: number | undefined;
                avatar_subscript_url?: string | undefined;
            };
            space?: {
                s_img: string;
                l_img: string;
            } | undefined;
            rank?: string | undefined;
        };
        following: boolean;
        archive_count: number;
        article_count: number;
        follower: number;
        like_num: number;
        space?: {
            s_img: string;
            l_img: string;
        } | undefined;
    };
}> {
  const u = await kyi
    .get('https://api.bilibili.com/x/web-interface/card', {
      searchParams: {
        mid: mid.toString(),
        photo,
      },
    })
    .json();
  return BiliApiInfoSchema.parse(u);
}
