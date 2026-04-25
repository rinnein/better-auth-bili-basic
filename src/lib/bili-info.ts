import z from 'zod';
import { kyi } from './ky';

const BiliApiInfoSchema = z.object({
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

export async function BiliInfo(mid: bigint, photo?: boolean) {
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
