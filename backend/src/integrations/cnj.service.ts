import axios from 'axios';
import 'dotenv/config'

export class CNJService {
  async getProcess(number: string) {
    try {
      const response = await axios.post(
        'https://api-publica.datajud.cnj.jus.br/api_publica_consulta',
        {
          numeroProcesso: number,
        },
        {
          headers: {
            Authorization: `ApiKey ${process.env.CNJ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.log('Erro CNJ:', error.response?.data || error.message);

      return {
        message: 'Processo não encontrado no CNJ ou API indisponível',
      };
    }
  }
}
