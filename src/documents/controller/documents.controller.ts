import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorator/response-message.decorator';
import { QueryDocumentsDto } from '../dto/query-documents.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentSummaryInterceptor } from '../interceptor/document-summary.interceptor';
import { Document } from '../model/document.entity';
import { DocumentsService } from '../services/documents.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@ApiTags('Documentos')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ResponseMessage('Documento subido y procesado correctamente')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir un documento de gasto (JPG, PNG o PDF)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documento subido correctamente',
    type: Document,
  })
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<Document> {
    return this.documentsService.create(file);
  }

  @Get()
  @UseInterceptors(DocumentSummaryInterceptor)
  @ApiOperation({
    summary: 'Listar documentos (filtrable por rango de fechas y categoría)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos',
    type: [Document],
  })
  findAll(@Query() query: QueryDocumentsDto): Promise<Document[]> {
    return this.documentsService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Documento encontrado')
  @ApiOperation({ summary: 'Consultar un documento por su id' })
  @ApiResponse({
    status: 200,
    description: 'Documento encontrado',
    type: Document,
  })
  @ApiNotFoundResponse({ description: 'Documento no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Documento actualizado y marcado como revisado')
  @ApiOperation({
    summary:
      'Corregir o completar los campos de un documento (revisión humana)',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento actualizado y marcado como revisado',
    type: Document,
  })
  @ApiNotFoundResponse({ description: 'Documento no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @ResponseMessage('Documento eliminado correctamente')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un documento y su archivo asociado' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  @ApiNotFoundResponse({ description: 'Documento no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}
