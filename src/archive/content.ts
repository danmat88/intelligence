import type { ArchiveExam } from './catalog'
import type { BacTrack } from '../product/profile'
import en2026ModelSectionI from './papers/en-2026-model-I.json'
import en2026ModelSectionII from './papers/en-2026-model-II.json'
import en2026ModelSectionIII from './papers/en-2026-model-III.json'
import en2026JuneSectionI from './papers/en-2026-june-I.json'
import en2026JuneSectionII from './papers/en-2026-june-II.json'
import en2026JuneSectionIII from './papers/en-2026-june-III.json'
import bac2026JuneMateInfoSectionI from './papers/bac-2026-june-mate-info-I.json'
import bac2026JuneMateInfoSectionII from './papers/bac-2026-june-mate-info-II.json'
import bac2026JuneMateInfoSectionIII from './papers/bac-2026-june-mate-info-III.json'
import bac2026JuneStNatSectionI from './papers/bac-2026-june-st-nat-I.json'
import bac2026JuneStNatSectionII from './papers/bac-2026-june-st-nat-II.json'
import bac2026JuneStNatSectionIII from './papers/bac-2026-june-st-nat-III.json'
import bac2026JuneTehnologicSectionI from './papers/bac-2026-june-tehnologic-I.json'
import bac2026JuneTehnologicSectionII from './papers/bac-2026-june-tehnologic-II.json'
import bac2026JuneTehnologicSectionIII from './papers/bac-2026-june-tehnologic-III.json'
import bac2026JunePedagogicSectionI from './papers/bac-2026-june-pedagogic-I.json'
import bac2026JunePedagogicSectionII from './papers/bac-2026-june-pedagogic-II.json'
import bac2026JunePedagogicSectionIII from './papers/bac-2026-june-pedagogic-III.json'
import bac2026ModelMateInfoSectionI from './papers/bac-2026-model-mate-info-I.json'
import bac2026ModelMateInfoSectionII from './papers/bac-2026-model-mate-info-II.json'
import bac2026ModelMateInfoSectionIII from './papers/bac-2026-model-mate-info-III.json'
import bac2026ModelStNatSectionI from './papers/bac-2026-model-st-nat-I.json'
import bac2026ModelStNatSectionII from './papers/bac-2026-model-st-nat-II.json'
import bac2026ModelStNatSectionIII from './papers/bac-2026-model-st-nat-III.json'
import bac2026ModelTehnologicSectionI from './papers/bac-2026-model-tehnologic-I.json'
import bac2026ModelTehnologicSectionII from './papers/bac-2026-model-tehnologic-II.json'
import bac2026ModelTehnologicSectionIII from './papers/bac-2026-model-tehnologic-III.json'
import bac2026ModelPedagogicSectionI from './papers/bac-2026-model-pedagogic-I.json'
import bac2026ModelPedagogicSectionII from './papers/bac-2026-model-pedagogic-II.json'
import bac2026ModelPedagogicSectionIII from './papers/bac-2026-model-pedagogic-III.json'
import en2025JuneSectionI from './papers/en-2025-june-I.json'
import en2025JuneSectionII from './papers/en-2025-june-II.json'
import en2025JuneSectionIII from './papers/en-2025-june-III.json'
import bac2025JuneMateInfoSectionI from './papers/bac-2025-june-mate-info-I.json'
import bac2025JuneMateInfoSectionII from './papers/bac-2025-june-mate-info-II.json'
import bac2025JuneMateInfoSectionIII from './papers/bac-2025-june-mate-info-III.json'
import bac2025JuneStNatSectionI from './papers/bac-2025-june-st-nat-I.json'
import bac2025JuneStNatSectionII from './papers/bac-2025-june-st-nat-II.json'
import bac2025JuneStNatSectionIII from './papers/bac-2025-june-st-nat-III.json'
import bac2025JuneTehnologicSectionI from './papers/bac-2025-june-tehnologic-I.json'
import bac2025JuneTehnologicSectionII from './papers/bac-2025-june-tehnologic-II.json'
import bac2025JuneTehnologicSectionIII from './papers/bac-2025-june-tehnologic-III.json'
import bac2025JunePedagogicSectionI from './papers/bac-2025-june-pedagogic-I.json'
import bac2025JunePedagogicSectionII from './papers/bac-2025-june-pedagogic-II.json'
import bac2025JunePedagogicSectionIII from './papers/bac-2025-june-pedagogic-III.json'
import en2024JuneSectionI from './papers/en-2024-june-I.json'
import en2024JuneSectionII from './papers/en-2024-june-II.json'
import en2024JuneSectionIII from './papers/en-2024-june-III.json'
import bac2024JulyMateInfoSectionI from './papers/bac-2024-june-mate-info-I.json'
import bac2024JulyMateInfoSectionII from './papers/bac-2024-june-mate-info-II.json'
import bac2024JulyMateInfoSectionIII from './papers/bac-2024-june-mate-info-III.json'
import bac2024JulyStNatSectionI from './papers/bac-2024-june-st-nat-I.json'
import bac2024JulyStNatSectionII from './papers/bac-2024-june-st-nat-II.json'
import bac2024JulyStNatSectionIII from './papers/bac-2024-june-st-nat-III.json'
import bac2024JulyTehnologicSectionI from './papers/bac-2024-june-tehnologic-I.json'
import bac2024JulyTehnologicSectionII from './papers/bac-2024-june-tehnologic-II.json'
import bac2024JulyTehnologicSectionIII from './papers/bac-2024-june-tehnologic-III.json'
import bac2024JulyPedagogicSectionI from './papers/bac-2024-june-pedagogic-I.json'
import bac2024JulyPedagogicSectionII from './papers/bac-2024-june-pedagogic-II.json'
import bac2024JulyPedagogicSectionIII from './papers/bac-2024-june-pedagogic-III.json'
import en2023JuneSectionI from './papers/en-2023-june-I.json'
import en2023JuneSectionII from './papers/en-2023-june-II.json'
import en2023JuneSectionIII from './papers/en-2023-june-III.json'
import bac2023JuneMateInfoSectionI from './papers/bac-2023-june-mate-info-I.json'
import bac2023JuneMateInfoSectionII from './papers/bac-2023-june-mate-info-II.json'
import bac2023JuneMateInfoSectionIII from './papers/bac-2023-june-mate-info-III.json'
import bac2023JuneStNatSectionI from './papers/bac-2023-june-st-nat-I.json'
import bac2023JuneStNatSectionII from './papers/bac-2023-june-st-nat-II.json'
import bac2023JuneStNatSectionIII from './papers/bac-2023-june-st-nat-III.json'
import bac2023JuneTehnologicSectionI from './papers/bac-2023-june-tehnologic-I.json'
import bac2023JuneTehnologicSectionII from './papers/bac-2023-june-tehnologic-II.json'
import bac2023JuneTehnologicSectionIII from './papers/bac-2023-june-tehnologic-III.json'
import bac2023JunePedagogicSectionI from './papers/bac-2023-june-pedagogic-I.json'
import bac2023JunePedagogicSectionII from './papers/bac-2023-june-pedagogic-II.json'
import bac2023JunePedagogicSectionIII from './papers/bac-2023-june-pedagogic-III.json'
import en2022JuneSectionI from './papers/en-2022-june-I.json'
import en2022JuneSectionII from './papers/en-2022-june-II.json'
import en2022JuneSectionIII from './papers/en-2022-june-III.json'
import bac2022JuneMateInfoSectionI from './papers/bac-2022-june-mate-info-I.json'
import bac2022JuneMateInfoSectionII from './papers/bac-2022-june-mate-info-II.json'
import bac2022JuneMateInfoSectionIII from './papers/bac-2022-june-mate-info-III.json'
import bac2022JuneStNatSectionI from './papers/bac-2022-june-st-nat-I.json'
import bac2022JuneStNatSectionII from './papers/bac-2022-june-st-nat-II.json'
import bac2022JuneStNatSectionIII from './papers/bac-2022-june-st-nat-III.json'
import bac2022JuneTehnologicSectionI from './papers/bac-2022-june-tehnologic-I.json'
import bac2022JuneTehnologicSectionII from './papers/bac-2022-june-tehnologic-II.json'
import bac2022JuneTehnologicSectionIII from './papers/bac-2022-june-tehnologic-III.json'
import bac2022JunePedagogicSectionI from './papers/bac-2022-june-pedagogic-I.json'
import bac2022JunePedagogicSectionII from './papers/bac-2022-june-pedagogic-II.json'
import bac2022JunePedagogicSectionIII from './papers/bac-2022-june-pedagogic-III.json'

export type OfficialExercise = {
  id: string
  number: string
  points: number
  competency: string
  prompt: string
  options?: Array<{ id: string; label: string }>
  correctOption?: string
  expectedAnswer: string
  hint: string
  solution: string[]
  figureDescription?: string
  figure?: OfficialFigureSpec
}

export type OfficialFigureSpec =
  | {
      kind: 'bar-chart'
      labels: string[]
      values: number[]
      highlightIndex?: number
    }
  | {
      kind: 'segment'
      points: Array<{ label: string; position: number }>
      measures?: Array<{ from: string; to: string; label: string }>
    }
  | {
      kind: 'sketch'
      points: Array<{
        id: string
        label?: string
        x: number
        y: number
        labelDx?: number
        labelDy?: number
        showDot?: boolean
      }>
      strokes: Array<{
        points: string[]
        closed?: boolean
        dashed?: boolean
      }>
      circles?: Array<{ center: string; radius: number; dashed?: boolean }>
      ellipses?: Array<{ center: string; radiusX: number; radiusY: number; dashed?: boolean }>
    }

export type OfficialSection = {
  id: string
  title: string
  instructions: string
  points: number
  exercises: OfficialExercise[]
}

/** A paper may enter this list only after every prompt, figure, answer and
 * scoring step has been compared with both official PDFs. */
export type NativeOfficialPaper = {
  id: string
  exam: ArchiveExam
  year: number
  session: string
  profile?: BacTrack
  title: string
  durationMinutes: number
  pointsFromOffice: number
  sourcePackageId: string
  sourceUrl: string
  sections: OfficialSection[]
}

export type OfficialSourcePackage = {
  id: string
  exam: ArchiveExam
  year: number
  session: string
  profile?: BacTrack
  sourceUrl: string
  sourceSha256s: string[]
  paperEntry: string
  markingSchemeEntry: string
  verifiedAt: string
  status: 'source_verified' | 'interactive_verified'
}

const BAC_MODEL_URL = 'https://www.subiecte.edu.ro/2026/bacalaureat/modeledesubiecte/probescrise/Bac_2026_E_c_Matematica_modele.zip'
const BAC_MODEL_SHA256 = 'D5CBB4F5C539A1CA8F1FFF8CAA02F665A20899F229076461E713D1FAA27A2D7C'
const BAC_2026_JUNE_URL = 'https://www.subiecte.edu.ro/2026/bacalaureat/Subiecte_si_bareme/Ec_2026_ses_iunie-iulie_01072026.zip'
const BAC_2026_JUNE_SHA256 = 'E0184BCCB53B1649239F4C0D9DE61C273CDAA63359977575CE007565255EC0E0'

/** Provenance registry. `source_verified` means the official source documents,
 * their hashes and filenames were checked; it does NOT authorize an interactive paper. */
export const OFFICIAL_SOURCE_PACKAGES: OfficialSourcePackage[] = [
  {
    id: 'en-2022-june',
    exam: 'en',
    year: 2022,
    session: 'Sesiunea iunie',
    sourceUrl: 'https://subiecte.edu.ro/2022/evaluarenationala/Subiecte_si_bareme/',
    sourceSha256s: ['EF084A586F33BF6C9CC85EE4BF722F0B55E13D282D365AA5394FE275EDCDD126'],
    paperEntry: 'ENVIII_Matematica_2022_Var_02_LRO.pdf',
    markingSchemeEntry: 'ENVIII_Matematica_2022_Bar_02_LRO.pdf',
    verifiedAt: '2026-08-02',
    status: 'interactive_verified',
  },
  ...([
    ['mate_info', 'mate-info', '22DA920C51A3CA203B469923ED9E39A0DC6B27CFEDCD2D2C7C1EDA0B0408A2A4', '34DC3AC570309B5AE005310FC9071AE49ADE40195A3AB0A90489EEA799AAAAD6'],
    ['stiinte_naturii', 'st-nat', '5E3E53AAE0D4FB2DDEEEB01D6C8FE8D0811E932AFF6DB3883009E26DFFF93081', '42C9143D4691C4BB7F2C8DC13CA3C8B79DC885AF03F7F345D610C1AACA8EB01F'],
    ['tehnologic', 'tehnologic', '39687806860B6C22C2CA03514411F4D1486FA1ABD5B0BA925A35DBA4680731D4', '732FE25109F8D80610F5C0FA9203E1C6EC91BC2D65EACA383F186BD4058AAE53'],
    ['pedagogic', 'pedagogic', '2965D00300B8AB00A3BAC494606F2719F92717C5751AA057DF9FD54484B60E66', 'EAECAC1AE5347BF707CDBB758B4B473DD87665DF2557E9081960CABBF9DBB427'],
  ] as const).map(([profile, fileProfile, paperSha256, markingSha256]) => ({
    id: `bac-2022-june-${profile}`,
    exam: 'bac' as const,
    year: 2022,
    session: 'Sesiunea iunie',
    profile,
    sourceUrl: 'https://subiecte.edu.ro/2022/bacalaureat/Subiecte_si_bareme/',
    sourceSha256s: [paperSha256, markingSha256],
    paperEntry: `E_c_matematica_M_${fileProfile}_2022_var_01_LRO.pdf`,
    markingSchemeEntry: `E_c_matematica_M_${fileProfile}_2022_bar_01_LRO.pdf`,
    verifiedAt: '2026-08-02',
    status: 'interactive_verified' as const,
  })),
  {
    id: 'en-2023-june',
    exam: 'en',
    year: 2023,
    session: 'Sesiunea iunie',
    sourceUrl: 'https://subiecte.edu.ro/2023/evaluarenationala/Subiecte_si_bareme/',
    sourceSha256s: ['3C1A49977A29172E6EB421CBAD45D6B272DB2B699937583A7F06A98312673D08'],
    paperEntry: 'ENVIII_Matematica_2023_Var_01_LRO.pdf',
    markingSchemeEntry: 'ENVIII_Matematica_2023_Bar_01_LRO.pdf',
    verifiedAt: '2026-08-01',
    status: 'interactive_verified',
  },
  ...([
    ['mate_info', 'mate-info', '5AFF90F6CE50AC34297F3D9A5DE19CE1EF178AEF50361C0F6A11D143A389CF62', 'D001C0D6EC5B1A61F0CA9004167A878B924D18841F516D7ABADB7DE1C5DE3F22'],
    ['stiinte_naturii', 'st-nat', '3F2F5FE27B1CF81A2F365BAA0AF7378FBA07CE95B0DA2EB31EAA6387A9789BC1', '2CC9F4C9B8996A3A543039B8D602E3189E513EABBE1404EE0679ED2E48A9F397'],
    ['tehnologic', 'tehnologic', '28FD37330A5816F10BBA139B8238A1689280607DDDE99231877F769E2516D511', '3400342E8167EB5A4468E9F4E22185F4D077D1F7F916326BDDDC4425182B033F'],
    ['pedagogic', 'pedagogic', 'CA6C26043D33D8E53D5455171F0EF6AB0337AAB68FAFF3DD154540E50F9F5EDD', 'A53077889DEF4A44E85E942AC11E9DFFFC57DDAC91F63A7C790CA2317A863B60'],
  ] as const).map(([profile, fileProfile, paperSha256, markingSha256]) => ({
    id: `bac-2023-june-${profile}`,
    exam: 'bac' as const,
    year: 2023,
    session: 'Sesiunea iunie',
    profile,
    sourceUrl: 'https://subiecte.edu.ro/2023/bacalaureat/Subiecte_si_bareme/',
    sourceSha256s: [paperSha256, markingSha256],
    paperEntry: `E_c_matematica_M_${fileProfile}_2023_var_01_LRO.pdf`,
    markingSchemeEntry: `E_c_matematica_M_${fileProfile}_2023_bar_01_LRO.pdf`,
    verifiedAt: '2026-08-01',
    status: 'interactive_verified' as const,
  })),
  {
    id: 'en-2024-june',
    exam: 'en',
    year: 2024,
    session: 'Sesiunea iunie',
    sourceUrl: 'https://subiecte.edu.ro/2024/evaluarenationala/Subiecte_si_bareme/',
    sourceSha256s: ['C7942BA5110A8CF349857B8C9298F0A39173B727E8928BA0AA68329EEEE5B679'],
    paperEntry: 'ENVIII_Matematica_2024_Var_07_LRO.pdf',
    markingSchemeEntry: 'ENVIII_Matematica_2024_Bar_07_LRO.pdf',
    verifiedAt: '2026-08-01',
    status: 'interactive_verified',
  },
  ...([
    ['mate_info', 'mate-info', '8815CF3CF74E28935C75B1C0C49531B9DDF642E4BA923F5C8D1F5D07B0E42748', '11CF12929C74F41CCE20C2044B67B80D9E2EFD465E0519D779C6540329582869'],
    ['stiinte_naturii', 'st-nat', '972B5DDC66D31AD1ED696B0A1F214C6100959CE210EF9CEA3F5AC83E8BEB6C54', 'F13B32E5553348EFA146909CD5F32D723CC3A613AE6B554383BF694A4790655E'],
    ['tehnologic', 'tehnologic', '8883F6B2BCE58C09D2AA8277175220F815A311BB7338C230B65C333AABBD8355', 'F7E645AE7F61196F9A95E748499B0C48F54A3A2EBC17E326C1D1CA98795E25CE'],
    ['pedagogic', 'pedagogic', '54CDA9C2F2FB2046C67A79D71D7BC5856789DC7E0DAE66D0EA2FB4ED59506F0E', '8A3E30A25FA377D1C090623330A75C92A1D2C77FAA966EE6439C1B2D7AE49840'],
  ] as const).map(([profile, fileProfile, paperSha256, markingSha256]) => ({
    id: `bac-2024-july-${profile}`,
    exam: 'bac' as const,
    year: 2024,
    session: 'Sesiunea iunie–iulie',
    profile,
    sourceUrl: 'https://subiecte.edu.ro/2024/bacalaureat/Subiecte_si_bareme/',
    sourceSha256s: [paperSha256, markingSha256],
    paperEntry: `E_c_matematica_M_${fileProfile}_2024_var_10_LRO.pdf`,
    markingSchemeEntry: `E_c_matematica_M_${fileProfile}_2024_bar_10_LRO.pdf`,
    verifiedAt: '2026-08-01',
    status: 'interactive_verified' as const,
  })),
  {
    id: 'en-2025-june',
    exam: 'en',
    year: 2025,
    session: 'Sesiunea iunie',
    sourceUrl: 'https://subiecte.edu.ro/2025/evaluarenationala/Subiecte_si_bareme/',
    sourceSha256s: ['E689313A1ADE9DDC4EFBB5E24F4C97AC6E5FFB48321245C1912FCD7A0E171F00'],
    paperEntry: 'ENVIII_Matematica_2025_Var_01_LRO.pdf',
    markingSchemeEntry: 'ENVIII_Matematica_2025_Bar_01_LRO.pdf',
    verifiedAt: '2026-08-01',
    status: 'interactive_verified',
  },
  ...([
    ['mate_info', 'mate-info', 'F93975956D4D3FFF8251C7459EED1EF9280AE773E40D1F0DE49FDB0BFE048372', '11338E98B9F2035A4C2A59B9B4CDB0FA4CC0BD5DE49CE62FA5F7A30103BCFEB8'],
    ['stiinte_naturii', 'st-nat', '0BD7866F5F4DC23A573176FEDD03CF582CFD3F61926969BFF1280BAE6FC7EC9F', 'D98FF55C75561638B752B53C86E65966543ACF4EF58A2BC18EBAF52236D982E6'],
    ['tehnologic', 'tehnologic', '353E67385E944D278B5DE1297C046539E0742DFAF6308308F5E53DE755848CBF', 'D7F28DB834E475851EB0A454686D3EC39A86A4F5CE1E9DD751BC6BEB73A5969F'],
    ['pedagogic', 'pedagogic', '7897E50C427EC9AC1B70D88966D3BBDA0D83A4E187314B3AE6C4810D39000B7C', 'B7ACD75CBDD26B458B824545EFC410E1C2A994272B9B7CB74E81F3D50636D451'],
  ] as const).map(([profile, fileProfile, paperSha256, markingSha256]) => ({
    id: `bac-2025-june-${profile}`,
    exam: 'bac' as const,
    year: 2025,
    session: 'Sesiunea iunie',
    profile,
    sourceUrl: 'https://subiecte.edu.ro/2025/bacalaureat/Subiecte_si_bareme/',
    sourceSha256s: [paperSha256, markingSha256],
    paperEntry: `E_c_matematica_M_${fileProfile}_2025_var_01_LRO.pdf`,
    markingSchemeEntry: `E_c_matematica_M_${fileProfile}_2025_bar_01_LRO.pdf`,
    verifiedAt: '2026-08-01',
    status: 'interactive_verified' as const,
  })),
  {
    id: 'en-2026-june',
    exam: 'en',
    year: 2026,
    session: 'Sesiunea iunie',
    sourceUrl: 'https://www.subiecte.edu.ro/2026/evaluarenationala/Subiecte_si_bareme/EN_VIII_2026_Matematica.zip',
    sourceSha256s: ['5FF59A950CBDB0979B876F92CEF3820F2056A7DB0C48079E7210521479665831'],
    paperEntry: 'EN_VIII_2026_Matematica/ENVIII_Matematica_2026_Var_01_LRO.pdf',
    markingSchemeEntry: 'EN_VIII_2026_Matematica/ENVIII_Matematica_2026_Bar_01_LRO.pdf',
    verifiedAt: '2026-08-01',
    status: 'interactive_verified',
  },
  {
    id: 'en-2026-model',
    exam: 'en',
    year: 2026,
    session: 'Model oficial',
    sourceUrl: 'https://www.subiecte.edu.ro/2026/evaluarenationala/modeledesubiecte/EN_VIII_2026_Matematica_model.zip',
    sourceSha256s: ['AD3B4E34BF16BA60EC85682DBA90B495743234428C8962E4B1227F8468D26074'],
    paperEntry: 'EN_VIII_2026_Matematica_model/EN_VIII_2026_Matematica_var_model.pdf',
    markingSchemeEntry: 'EN_VIII_2026_Matematica_model/EN_VIII_2026_Matematica_bar_model.pdf',
    verifiedAt: '2026-08-01',
    status: 'interactive_verified',
  },
  ...([
    ['mate_info', 'mate-info'],
    ['stiinte_naturii', 'st-nat'],
    ['tehnologic', 'tehnologic'],
    ['pedagogic', 'pedagogic'],
  ] as const).map(([profile, fileProfile]) => ({
    id: `bac-2026-model-${profile}`,
    exam: 'bac' as const,
    year: 2026,
    session: 'Model oficial',
    profile,
    sourceUrl: BAC_MODEL_URL,
    sourceSha256s: [BAC_MODEL_SHA256],
    paperEntry: `Bac_2026_E_c_Matematica_modele/E_c_matematica_M_${fileProfile}_2026_var_model.pdf`,
    markingSchemeEntry: `Bac_2026_E_c_Matematica_modele/E_c_matematica_M_${fileProfile}_2026_bar_model.pdf`,
    verifiedAt: '2026-08-01',
    status: 'interactive_verified' as const,
  })),
  ...([
    ['mate_info', 'mate-info'],
    ['stiinte_naturii', 'st-nat'],
    ['tehnologic', 'tehnologic'],
    ['pedagogic', 'pedagogic'],
  ] as const).map(([profile, fileProfile]) => ({
    id: `bac-2026-june-${profile}`,
    exam: 'bac' as const,
    year: 2026,
    session: 'Sesiunea iunie–iulie',
    profile,
    sourceUrl: BAC_2026_JUNE_URL,
    sourceSha256s: [BAC_2026_JUNE_SHA256],
    paperEntry: `Ec_2026_ses_iunie-iulie/E_c_matematica_M_${fileProfile}_2026_var_03_LRO.pdf`,
    markingSchemeEntry: `Ec_2026_ses_iunie-iulie/E_c_matematica_M_${fileProfile}_2026_bar_03_LRO.pdf`,
    verifiedAt: '2026-08-01',
    status: 'interactive_verified' as const,
  })),
]

export const NATIVE_OFFICIAL_PAPERS: NativeOfficialPaper[] = [
  {
    id: 'en-2022-june',
    exam: 'en',
    year: 2022,
    session: 'Sesiunea iunie',
    title: 'Evaluarea Națională 2022 · Matematică · Sesiunea iunie',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2022-june',
    sourceUrl: 'https://subiecte.edu.ro/2022/evaluarenationala/Subiecte_si_bareme/',
    sections: [
      en2022JuneSectionI as OfficialSection,
      en2022JuneSectionII as OfficialSection,
      en2022JuneSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2022-june-pedagogic',
    exam: 'bac',
    year: 2022,
    session: 'Sesiunea iunie',
    profile: 'pedagogic',
    title: 'Bacalaureat 2022 · Matematică M_pedagogic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2022-june-pedagogic',
    sourceUrl: 'https://subiecte.edu.ro/2022/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2022JunePedagogicSectionI as OfficialSection,
      bac2022JunePedagogicSectionII as OfficialSection,
      bac2022JunePedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2022-june-tehnologic',
    exam: 'bac',
    year: 2022,
    session: 'Sesiunea iunie',
    profile: 'tehnologic',
    title: 'Bacalaureat 2022 · Matematică M_tehnologic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2022-june-tehnologic',
    sourceUrl: 'https://subiecte.edu.ro/2022/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2022JuneTehnologicSectionI as OfficialSection,
      bac2022JuneTehnologicSectionII as OfficialSection,
      bac2022JuneTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2022-june-stiinte_naturii',
    exam: 'bac',
    year: 2022,
    session: 'Sesiunea iunie',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2022 · Matematică M_șt-nat · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2022-june-stiinte_naturii',
    sourceUrl: 'https://subiecte.edu.ro/2022/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2022JuneStNatSectionI as OfficialSection,
      bac2022JuneStNatSectionII as OfficialSection,
      bac2022JuneStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2022-june-mate_info',
    exam: 'bac',
    year: 2022,
    session: 'Sesiunea iunie',
    profile: 'mate_info',
    title: 'Bacalaureat 2022 · Matematică M_mate-info · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2022-june-mate_info',
    sourceUrl: 'https://subiecte.edu.ro/2022/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2022JuneMateInfoSectionI as OfficialSection,
      bac2022JuneMateInfoSectionII as OfficialSection,
      bac2022JuneMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'en-2023-june',
    exam: 'en',
    year: 2023,
    session: 'Sesiunea iunie',
    title: 'Evaluarea Națională 2023 · Matematică · Sesiunea iunie',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2023-june',
    sourceUrl: 'https://subiecte.edu.ro/2023/evaluarenationala/Subiecte_si_bareme/',
    sections: [
      en2023JuneSectionI as OfficialSection,
      en2023JuneSectionII as OfficialSection,
      en2023JuneSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2023-june-pedagogic',
    exam: 'bac',
    year: 2023,
    session: 'Sesiunea iunie',
    profile: 'pedagogic',
    title: 'Bacalaureat 2023 · Matematică M_pedagogic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2023-june-pedagogic',
    sourceUrl: 'https://subiecte.edu.ro/2023/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2023JunePedagogicSectionI as OfficialSection,
      bac2023JunePedagogicSectionII as OfficialSection,
      bac2023JunePedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2023-june-tehnologic',
    exam: 'bac',
    year: 2023,
    session: 'Sesiunea iunie',
    profile: 'tehnologic',
    title: 'Bacalaureat 2023 · Matematică M_tehnologic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2023-june-tehnologic',
    sourceUrl: 'https://subiecte.edu.ro/2023/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2023JuneTehnologicSectionI as OfficialSection,
      bac2023JuneTehnologicSectionII as OfficialSection,
      bac2023JuneTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2023-june-stiinte_naturii',
    exam: 'bac',
    year: 2023,
    session: 'Sesiunea iunie',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2023 · Matematică M_șt-nat · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2023-june-stiinte_naturii',
    sourceUrl: 'https://subiecte.edu.ro/2023/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2023JuneStNatSectionI as OfficialSection,
      bac2023JuneStNatSectionII as OfficialSection,
      bac2023JuneStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2023-june-mate_info',
    exam: 'bac',
    year: 2023,
    session: 'Sesiunea iunie',
    profile: 'mate_info',
    title: 'Bacalaureat 2023 · Matematică M_mate-info · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2023-june-mate_info',
    sourceUrl: 'https://subiecte.edu.ro/2023/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2023JuneMateInfoSectionI as OfficialSection,
      bac2023JuneMateInfoSectionII as OfficialSection,
      bac2023JuneMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'en-2024-june',
    exam: 'en',
    year: 2024,
    session: 'Sesiunea iunie',
    title: 'Evaluarea Națională 2024 · Matematică · Sesiunea iunie',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2024-june',
    sourceUrl: 'https://subiecte.edu.ro/2024/evaluarenationala/Subiecte_si_bareme/',
    sections: [
      en2024JuneSectionI as OfficialSection,
      en2024JuneSectionII as OfficialSection,
      en2024JuneSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2024-july-pedagogic',
    exam: 'bac',
    year: 2024,
    session: 'Sesiunea iunie–iulie',
    profile: 'pedagogic',
    title: 'Bacalaureat 2024 · Matematică M_pedagogic · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2024-july-pedagogic',
    sourceUrl: 'https://subiecte.edu.ro/2024/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2024JulyPedagogicSectionI as OfficialSection,
      bac2024JulyPedagogicSectionII as OfficialSection,
      bac2024JulyPedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2024-july-tehnologic',
    exam: 'bac',
    year: 2024,
    session: 'Sesiunea iunie–iulie',
    profile: 'tehnologic',
    title: 'Bacalaureat 2024 · Matematică M_tehnologic · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2024-july-tehnologic',
    sourceUrl: 'https://subiecte.edu.ro/2024/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2024JulyTehnologicSectionI as OfficialSection,
      bac2024JulyTehnologicSectionII as OfficialSection,
      bac2024JulyTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2024-july-stiinte_naturii',
    exam: 'bac',
    year: 2024,
    session: 'Sesiunea iunie–iulie',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2024 · Matematică M_șt-nat · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2024-july-stiinte_naturii',
    sourceUrl: 'https://subiecte.edu.ro/2024/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2024JulyStNatSectionI as OfficialSection,
      bac2024JulyStNatSectionII as OfficialSection,
      bac2024JulyStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2024-july-mate_info',
    exam: 'bac',
    year: 2024,
    session: 'Sesiunea iunie–iulie',
    profile: 'mate_info',
    title: 'Bacalaureat 2024 · Matematică M_mate-info · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2024-july-mate_info',
    sourceUrl: 'https://subiecte.edu.ro/2024/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2024JulyMateInfoSectionI as OfficialSection,
      bac2024JulyMateInfoSectionII as OfficialSection,
      bac2024JulyMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'en-2025-june',
    exam: 'en',
    year: 2025,
    session: 'Sesiunea iunie',
    title: 'Evaluarea Națională 2025 · Matematică · Sesiunea iunie',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2025-june',
    sourceUrl: 'https://subiecte.edu.ro/2025/evaluarenationala/Subiecte_si_bareme/',
    sections: [
      en2025JuneSectionI as OfficialSection,
      en2025JuneSectionII as OfficialSection,
      en2025JuneSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2025-june-pedagogic',
    exam: 'bac',
    year: 2025,
    session: 'Sesiunea iunie',
    profile: 'pedagogic',
    title: 'Bacalaureat 2025 · Matematică M_pedagogic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2025-june-pedagogic',
    sourceUrl: 'https://subiecte.edu.ro/2025/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2025JunePedagogicSectionI as OfficialSection,
      bac2025JunePedagogicSectionII as OfficialSection,
      bac2025JunePedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2025-june-tehnologic',
    exam: 'bac',
    year: 2025,
    session: 'Sesiunea iunie',
    profile: 'tehnologic',
    title: 'Bacalaureat 2025 · Matematică M_tehnologic · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2025-june-tehnologic',
    sourceUrl: 'https://subiecte.edu.ro/2025/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2025JuneTehnologicSectionI as OfficialSection,
      bac2025JuneTehnologicSectionII as OfficialSection,
      bac2025JuneTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2025-june-stiinte_naturii',
    exam: 'bac',
    year: 2025,
    session: 'Sesiunea iunie',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2025 · Matematică M_șt-nat · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2025-june-stiinte_naturii',
    sourceUrl: 'https://subiecte.edu.ro/2025/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2025JuneStNatSectionI as OfficialSection,
      bac2025JuneStNatSectionII as OfficialSection,
      bac2025JuneStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2025-june-mate_info',
    exam: 'bac',
    year: 2025,
    session: 'Sesiunea iunie',
    profile: 'mate_info',
    title: 'Bacalaureat 2025 · Matematică M_mate-info · Sesiunea iunie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2025-june-mate_info',
    sourceUrl: 'https://subiecte.edu.ro/2025/bacalaureat/Subiecte_si_bareme/',
    sections: [
      bac2025JuneMateInfoSectionI as OfficialSection,
      bac2025JuneMateInfoSectionII as OfficialSection,
      bac2025JuneMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-model-pedagogic',
    exam: 'bac',
    year: 2026,
    session: 'Model oficial',
    profile: 'pedagogic',
    title: 'Bacalaureat 2026 · Matematică M_pedagogic · Model oficial',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-model-pedagogic',
    sourceUrl: BAC_MODEL_URL,
    sections: [
      bac2026ModelPedagogicSectionI as OfficialSection,
      bac2026ModelPedagogicSectionII as OfficialSection,
      bac2026ModelPedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-model-tehnologic',
    exam: 'bac',
    year: 2026,
    session: 'Model oficial',
    profile: 'tehnologic',
    title: 'Bacalaureat 2026 · Matematică M_tehnologic · Model oficial',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-model-tehnologic',
    sourceUrl: BAC_MODEL_URL,
    sections: [
      bac2026ModelTehnologicSectionI as OfficialSection,
      bac2026ModelTehnologicSectionII as OfficialSection,
      bac2026ModelTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-model-stiinte_naturii',
    exam: 'bac',
    year: 2026,
    session: 'Model oficial',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2026 · Matematică M_șt-nat · Model oficial',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-model-stiinte_naturii',
    sourceUrl: BAC_MODEL_URL,
    sections: [
      bac2026ModelStNatSectionI as OfficialSection,
      bac2026ModelStNatSectionII as OfficialSection,
      bac2026ModelStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-model-mate_info',
    exam: 'bac',
    year: 2026,
    session: 'Model oficial',
    profile: 'mate_info',
    title: 'Bacalaureat 2026 · Matematică M_mate-info · Model oficial',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-model-mate_info',
    sourceUrl: BAC_MODEL_URL,
    sections: [
      bac2026ModelMateInfoSectionI as OfficialSection,
      bac2026ModelMateInfoSectionII as OfficialSection,
      bac2026ModelMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-june-pedagogic',
    exam: 'bac',
    year: 2026,
    session: 'Sesiunea iunie–iulie',
    profile: 'pedagogic',
    title: 'Bacalaureat 2026 · Matematică M_pedagogic · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-june-pedagogic',
    sourceUrl: BAC_2026_JUNE_URL,
    sections: [
      bac2026JunePedagogicSectionI as OfficialSection,
      bac2026JunePedagogicSectionII as OfficialSection,
      bac2026JunePedagogicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-june-tehnologic',
    exam: 'bac',
    year: 2026,
    session: 'Sesiunea iunie–iulie',
    profile: 'tehnologic',
    title: 'Bacalaureat 2026 · Matematică M_tehnologic · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-june-tehnologic',
    sourceUrl: BAC_2026_JUNE_URL,
    sections: [
      bac2026JuneTehnologicSectionI as OfficialSection,
      bac2026JuneTehnologicSectionII as OfficialSection,
      bac2026JuneTehnologicSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-june-stiinte_naturii',
    exam: 'bac',
    year: 2026,
    session: 'Sesiunea iunie–iulie',
    profile: 'stiinte_naturii',
    title: 'Bacalaureat 2026 · Matematică M_șt-nat · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-june-stiinte_naturii',
    sourceUrl: BAC_2026_JUNE_URL,
    sections: [
      bac2026JuneStNatSectionI as OfficialSection,
      bac2026JuneStNatSectionII as OfficialSection,
      bac2026JuneStNatSectionIII as OfficialSection,
    ],
  },
  {
    id: 'bac-2026-june-mate_info',
    exam: 'bac',
    year: 2026,
    session: 'Sesiunea iunie–iulie',
    profile: 'mate_info',
    title: 'Bacalaureat 2026 · Matematică M_mate-info · Sesiunea iunie–iulie',
    durationMinutes: 180,
    pointsFromOffice: 10,
    sourcePackageId: 'bac-2026-june-mate_info',
    sourceUrl: BAC_2026_JUNE_URL,
    sections: [
      bac2026JuneMateInfoSectionI as OfficialSection,
      bac2026JuneMateInfoSectionII as OfficialSection,
      bac2026JuneMateInfoSectionIII as OfficialSection,
    ],
  },
  {
    id: 'en-2026-june',
    exam: 'en',
    year: 2026,
    session: 'Sesiunea iunie',
    title: 'Evaluarea Națională 2026 · Matematică · Sesiunea iunie',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2026-june',
    sourceUrl: 'https://www.subiecte.edu.ro/2026/evaluarenationala/Subiecte_si_bareme/EN_VIII_2026_Matematica.zip',
    sections: [
      en2026JuneSectionI as OfficialSection,
      en2026JuneSectionII as OfficialSection,
      en2026JuneSectionIII as OfficialSection,
    ],
  },
  {
    id: 'en-2026-model',
    exam: 'en',
    year: 2026,
    session: 'Model oficial',
    title: 'Evaluarea Națională 2026 · Matematică · Model oficial',
    durationMinutes: 120,
    pointsFromOffice: 10,
    sourcePackageId: 'en-2026-model',
    sourceUrl: 'https://www.subiecte.edu.ro/2026/evaluarenationala/modeledesubiecte/EN_VIII_2026_Matematica_model.zip',
    sections: [
      en2026ModelSectionI as OfficialSection,
      en2026ModelSectionII as OfficialSection,
      en2026ModelSectionIII as OfficialSection,
    ],
  },
]

export function getNativeOfficialPaper(id: string, profile?: BacTrack): NativeOfficialPaper | null {
  return NATIVE_OFFICIAL_PAPERS.find(
    (paper) => paper.id === id && (!paper.profile || paper.profile === profile),
  ) ?? null
}
