import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CURRENT_LEGAL_DOCUMENTS } from "./legal-documents";

@ApiTags("legal")
@Controller("legal")
export class LegalController {
  @Get("documents")
  documents() {
    return { data: CURRENT_LEGAL_DOCUMENTS };
  }
}
