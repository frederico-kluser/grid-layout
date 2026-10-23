import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import Surface from './Surface';
import { transactions } from '../data';
import type { TransactionStatus, TransactionTone } from '../data';
import { T } from '../tokens';

const AVATAR_TONES: Record<TransactionTone, { bg: string; fg: string }> = {
  primary: { bg: T.primaryTint, fg: 'primary.main' },
  secondary: { bg: 'rgb(var(--mui-palette-secondary-mainChannel) / 0.1)', fg: 'secondary.main' },
  warning: { bg: T.warningTint, fg: 'warning.main' },
  neutral: { bg: T.neutralTint, fg: 'text.secondary' },
  error: { bg: T.errorTint, fg: 'error.main' },
};

const STATUS_STYLES: Record<TransactionStatus, { bg: string; fg: string }> = {
  Paid: { bg: T.successTint, fg: 'success.main' },
  Pending: { bg: T.warningTint, fg: 'warning.main' },
  Refunded: { bg: T.neutralTint, fg: 'text.secondary' },
};

export default function TransactionsTable() {
  return (
    <Surface sx={{ p: { xs: 2, md: 2.5 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">Recent transactions</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Latest payments across all connected accounts
          </Typography>
        </Box>
        <Button
          size="small"
          endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          View all
        </Button>
      </Stack>

      <TableContainer sx={{ flexGrow: 1 }}>
        <Table
          size="small"
          aria-label="Recent transactions"
          sx={{
            '& .MuiTableCell-root': { px: { xs: 1, sm: 2 } },
            '& .MuiTableCell-root:first-of-type': { pl: 0 },
            '& .MuiTableCell-root:last-of-type': { pr: 0 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Date</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Method</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const avatarTone = AVATAR_TONES[transaction.tone];
              const status = STATUS_STYLES[transaction.status];
              return (
                <TableRow
                  key={transaction.id}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 0 }, '& td': { py: 1.25 } }}
                >
                  <TableCell>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 11,
                          bgcolor: avatarTone.bg,
                          color: avatarTone.fg,
                        }}
                      >
                        {transaction.initials}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>
                          {transaction.name}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.35 }}>
                          {transaction.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {transaction.date}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {transaction.method}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {transaction.amount}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Chip
                      size="small"
                      label={transaction.status}
                      sx={{ bgcolor: status.bg, color: status.fg, fontWeight: 700 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Surface>
  );
}
