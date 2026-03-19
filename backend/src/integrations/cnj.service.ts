import axios from 'axios';
import 'dotenv/config';

export class CNJService {
  private resolveHeaders() {
    return {
      Authorization: `ApiKey ${process.env.CNJ_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  private extractList(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    const directList =
      data.items ??
      data.processos ??
      data.results ??
      data.data ??
      data.result ??
      data.hits?.hits;

    if (!Array.isArray(directList)) return [];

    if (directList.length > 0 && directList[0]?._source) {
      return directList.map((item) => item._source);
    }

    return directList;
  }

  async getProcess(number: string) {
    try {
      const response = await axios.post(
        'https://api-publica.datajud.cnj.jus.br/api_publica_consulta',
        {
          numeroProcesso: number,
        },
        {
          headers: this.resolveHeaders(),
        },
      );

      return response.data;
    } catch (error: any) {
      console.log('Erro CNJ:', error.response?.data || error.message);

      return {
        message: 'Processo nao encontrado no CNJ ou API indisponivel',
      };
    }
  }

  async searchByOab(oab: string) {
    const normalizedOab = oab.replace(/\s+/g, '').toUpperCase();
    const customSearchUrl = process.env.CNJ_OAB_SEARCH_URL?.trim();

    try {
      if (customSearchUrl) {
        const customResponse = await axios.post(
          customSearchUrl,
          { oab: normalizedOab },
          { headers: this.resolveHeaders() },
        );
        return this.extractList(customResponse.data);
      }

      const response = await axios.post(
        'https://api-publica.datajud.cnj.jus.br/api_publica_consulta',
        {
          numeroOab: normalizedOab,
        },
        {
          headers: this.resolveHeaders(),
        },
      );

      return this.extractList(response.data);
    } catch (error: any) {
      console.log('Erro busca OAB CNJ:', error.response?.data || error.message);
      return [];
    }
  }
}
