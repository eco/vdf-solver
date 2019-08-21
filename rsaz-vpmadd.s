##############################################################################
# Copyright 2014 Intel Corporation                                           #
#                                                                            #
# Licensed under the Apache License, Version 2.0 (the "License");            #
# you may not use this file except in compliance with the License.           #
# You may obtain a copy of the License at                                    #
#                                                                            #
#    http://www.apache.org/licenses/LICENSE-2.0                              #
#                                                                            #
# Unless required by applicable law or agreed to in writing, software        #
# distributed under the License is distributed on an "AS IS" BASIS,          #
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   #
# See the License for the specific language governing permissions and        #
# limitations under the License.                                             #
#                                                                            #
##############################################################################
#                                                                            #
#  Developers and authors:                                                   #
#  Shay Gueron (1, 2), and Vlad Krasnov (1)                                  #
#  (1) Intel Corporation, Israel Development Center                          #
#  (2) University of Haifa                                                   #
#  Reference:                                                                #
#  S.Gueron and V.Krasnov, "Software Implementation of Modular Exponentiation#
#  , Using Advanced Vector Instructions Architectures"                       #
#                                                                            #
##############################################################################

# Prototypes of functions in this document:
# void AMM_2048_IFMA(uint64_t *rp, const uint64_t *aptr, const uint64_t *bptr, const uint64_t *nptr, uint64_t n0);
# void norm2red52_2048(uint64_t *res, uint64_t *a);

.text
.p2align 6

.LpermMask0:
.word 0,1,2,3, 3,4,5,6, 6,7,8,9, 9,10,11,12, 13,14,15,16, 16,17,18,19, 19,20,21,22, 22,23,24,25

.LshiftMask0:
.quad 0,4,8,12,0,4,8,12

.LandMask:
.quad 0xfffffffffffff

################################################################################
.globl norm2red52_2048
.p2align 5
norm2red52_2048:
	mov	$0xFFFFFF, %eax
	kmovd	%eax, %k1

	vmovdqa64	.LpermMask0(%rip), %zmm0
	vmovdqa64	.LshiftMask0(%rip), %zmm1
	vpbroadcastq	.LandMask(%rip), %zmm10

	vpermw	52*0(%rsi), %zmm0, %zmm2
	vpermw	52*1(%rsi), %zmm0, %zmm3
	vpermw	52*2(%rsi), %zmm0, %zmm4
	vpermw	52*3(%rsi), %zmm0, %zmm5
	vmovdqu16	52*4(%rsi), %zmm6{%k1}{z}
	vpermw	%zmm6, %zmm0, %zmm6

	vpsrlvq	%zmm1, %zmm2, %zmm2
	vpsrlvq	%zmm1, %zmm3, %zmm3
	vpsrlvq	%zmm1, %zmm4, %zmm4
	vpsrlvq	%zmm1, %zmm5, %zmm5
	vpsrlvq	%zmm1, %zmm6, %zmm6

	vpandq	%zmm10, %zmm2, %zmm2
	vpandq	%zmm10, %zmm3, %zmm3
	vpandq	%zmm10, %zmm4, %zmm4
	vpandq	%zmm10, %zmm5, %zmm5
	vpandq	%zmm10, %zmm6, %zmm6

	vmovdqu64	%zmm2, 64*0(%rdi)
	vmovdqu64	%zmm3, 64*1(%rdi)
	vmovdqu64	%zmm4, 64*2(%rdi)
	vmovdqu64	%zmm5, 64*3(%rdi)
	vmovdqu64	%zmm6, 64*4(%rdi)
	ret

################################################################################
#void AMM_2048_IFMA(
.set res, %rdi	# uint64_t *rp,
.set a0, %rsi	# const uint64_t *ap,
.set bpi, %rdx	# const uint64_t *bptr,
.set m0, %rcx	# const uint64_t *np,
.set k0, %r8	# const uint64_t n0);

.set b_ptr, %rax

.set acc0, %r9

.set itr, %r10
.set t0, %r11
.set t1, %r12
.set t2, %r13

.set A0, %zmm0
.set A1, %zmm20
.set A2, %zmm2
.set A3, %zmm3
.set A4, %zmm4

.set M0, %zmm5
.set M1, %zmm6
.set M2, %zmm7
.set M3, %zmm8
.set M4, %zmm9

.set ACC0, %zmm10
.set ACC0_xmm, %xmm10
.set ACC1, %zmm11
.set ACC2, %zmm12
.set ACC3, %zmm13
.set ACC4, %zmm14

.set Y_curr, %zmm16
.set B_curr, %zmm18

.set TMP, %zmm1
.set TMP_xmm, %xmm1

.set ZERO, %zmm30
.set AND_MASK, %zmm31


.globl AMM_2048_IFMA
.p2align 5
AMM_2048_IFMA:
	push	%rbx
	push	%r12
	push	%r13
	push	%r14
	push	%r15

	mov	bpi, b_ptr

	mov	$1, t0
	mov	$0x7f, t1
	kmovq	t0, %k1
	kmovq	t1, %k2

	mov	.LandMask(%rip), %r15
	vpbroadcastq	%r15, AND_MASK
	vpxorq	ZERO, ZERO, ZERO

	# Load operands A into registers. A[0] is stored in ALU register, in order to compensate for the latency of IFMA when computing (A*B)[0] * K0
	vmovdqu64	8*1+64*0(a0), A0
	vmovdqu64	8*1+64*1(a0), A1
	vmovdqu64	8*1+64*2(a0), A2
	vmovdqu64	8*1+64*3(a0), A3
	vmovdqu64	8*1+64*4(a0), A4{%k2}{z}
	mov	8*0(a0), a0

	# Load the modulii
	vmovdqu64	8*1+64*0(m0), M0
	vmovdqu64	8*1+64*1(m0), M1
	vmovdqu64	8*1+64*2(m0), M2
	vmovdqu64	8*1+64*3(m0), M3
	vmovdqu64	8*1+64*4(m0), M4{%k2}{z}
	mov	8*0(m0), m0

	# Prepare the accumulators
	vpxorq	ACC0, ACC0, ACC0
	vpxorq	ACC1, ACC1, ACC1
	vpxorq	ACC2, ACC2, ACC2
	vpxorq	ACC3, ACC3, ACC3
	vpxorq	ACC4, ACC4, ACC4
	vpxorq	B_curr, B_curr, B_curr
	vpxorq	Y_curr, Y_curr, Y_curr


	# Hoist first low mul (high B and Y will be 0)
	mov	a0, %rdx
	mov	(b_ptr), %r14
	lea	8(b_ptr), b_ptr
	vpbroadcastq	%r14, B_curr
	mulx	%r14, acc0, t2

	mov	acc0, %rdx
	mulx	k0, %rdx, t0
	and	%r15, %rdx
	vpbroadcastq	%rdx, Y_curr

	mulx	m0, t0, t1
	add	t0, acc0
	adc	t1, t2

	shrd	$52, t2, acc0

	vpmadd52luq	B_curr, A0, ACC0
	vpmadd52luq	B_curr, A1, ACC1
	vpmadd52luq	B_curr, A2, ACC2
	vpmadd52luq	B_curr, A3, ACC3
	vpmadd52luq	B_curr, A4, ACC4

	vpmadd52luq	Y_curr, M0, ACC0
	vpmadd52luq	Y_curr, M1, ACC1
	vpmadd52luq	Y_curr, M2, ACC2
	vpmadd52luq	Y_curr, M3, ACC3
	vpmadd52luq	Y_curr, M4, ACC4

	vmovq	ACC0_xmm, t0
	add	t0, acc0

	mov	$39, itr

1:
		mov	(b_ptr), %r14
		lea	8(b_ptr), b_ptr
		mov	a0, %rdx

		mulx	%r14, t0, t2
		add	t0, acc0
		adc	$0, t2

		mov	acc0, %rdx
		mulx	k0, %rdx, t0
		and	%r15, %rdx

		mulx	m0, t0, t1
		add	t0, acc0
		adc	t1, t2

		shrd	$52, t2, acc0


		# Shift the ACC in zmms right by a word
		valignq $1, ACC0, ACC1, ACC0
		valignq $1, ACC1, ACC2, ACC1
		valignq $1, ACC2, ACC3, ACC2
		valignq $1, ACC3, ACC4, ACC3
		valignq $1, ACC4, ZERO, ACC4




		# High multiplications
		vpmadd52huq	B_curr, A0, ACC0
		vpmadd52huq	B_curr, A1, ACC1
		vpmadd52huq	B_curr, A2, ACC2
		vpmadd52huq	B_curr, A3, ACC3
		vpmadd52huq	B_curr, A4, ACC4

		vpmadd52huq	Y_curr, M0, ACC0
		vpmadd52huq	Y_curr, M1, ACC1
		vpmadd52huq	Y_curr, M2, ACC2
		vpmadd52huq	Y_curr, M3, ACC3
		vpmadd52huq	Y_curr, M4, ACC4

		# Low multiplications
		vpbroadcastq	%r14, B_curr
		vpbroadcastq	%rdx, Y_curr

		vpmadd52luq	B_curr, A0, ACC0
		vpmadd52luq	B_curr, A1, ACC1
		vpmadd52luq	B_curr, A2, ACC2
		vpmadd52luq	B_curr, A3, ACC3
		vpmadd52luq	B_curr, A4, ACC4

		vpmadd52luq	Y_curr, M0, ACC0
		vpmadd52luq	Y_curr, M1, ACC1
		vpmadd52luq	Y_curr, M2, ACC2
		vpmadd52luq	Y_curr, M3, ACC3
		vpmadd52luq	Y_curr, M4, ACC4

		vmovq	ACC0_xmm, t0
		add	t0, acc0


		dec	itr
		jne 1b

	vmovq	acc0, TMP_xmm
	vmovdqa64	TMP, ACC0{%k1}

	valignq	$7, A3, A4, A4
	valignq	$7, A2, A3, A3
	valignq	$7, A1, A2, A2
	valignq	$7, A0, A1, A1
	valignq	$7, ZERO, A0, A0

	valignq	$7, M3, M4, M4
	valignq	$7, M2, M3, M3
	valignq	$7, M1, M2, M2
	valignq	$7, M0, M1, M1
	valignq	$7, ZERO, M0, M0

	# The last high multiplications
	vpmadd52huq	B_curr, A0, ACC0
	vpmadd52huq	B_curr, A1, ACC1
	vpmadd52huq	B_curr, A2, ACC2
	vpmadd52huq	B_curr, A3, ACC3
	vpmadd52huq	B_curr, A4, ACC4

	vpmadd52huq	Y_curr, M0, ACC0
	vpmadd52huq	Y_curr, M1, ACC1
	vpmadd52huq	Y_curr, M2, ACC2
	vpmadd52huq	Y_curr, M3, ACC3
	vpmadd52huq	Y_curr, M4, ACC4

	# Now 'normalize' the result to 52 bit words
	vpsrlq	$52, ACC0, A0
	vpsrlq	$52, ACC1, A1
	vpsrlq	$52, ACC2, A2
	vpsrlq	$52, ACC3, A3
	vpsrlq	$52, ACC4, A4

	vpandq	AND_MASK, ACC0, ACC0
	vpandq	AND_MASK, ACC1, ACC1
	vpandq	AND_MASK, ACC2, ACC2
	vpandq	AND_MASK, ACC3, ACC3
	vpandq	AND_MASK, ACC4, ACC4

	valignq	$7, A3, A4, A4
	valignq	$7, A2, A3, A3
	valignq	$7, A1, A2, A2
	valignq	$7, A0, A1, A1
	valignq	$7, ZERO, A0, A0

	vpaddq	A0, ACC0, ACC0
	vpaddq	A1, ACC1, ACC1
	vpaddq	A2, ACC2, ACC2
	vpaddq	A3, ACC3, ACC3
	vpaddq	A4, ACC4, ACC4

	vpcmpuq	$1, ACC0, AND_MASK, %k1
	vpcmpuq	$1, ACC1, AND_MASK, %k2
	vpcmpuq	$1, ACC2, AND_MASK, %k3
	vpcmpuq	$1, ACC3, AND_MASK, %k4
	vpcmpuq	$1, ACC4, AND_MASK, %k5

	kmovb	%k1, %eax
	kmovb	%k2, %ebx
	kmovb	%k3, %ecx
	kmovb	%k4, %r11d
	kmovb	%k5, %r12d

	vpcmpuq	$0, AND_MASK, ACC0, %k1
	vpcmpuq	$0, AND_MASK, ACC1, %k2
	vpcmpuq	$0, AND_MASK, ACC2, %k3
	vpcmpuq	$0, AND_MASK, ACC3, %k4
	vpcmpuq	$0, AND_MASK, ACC4, %k5

	kmovb	%k1, %r8d
	kmovb	%k2, %r9d
	kmovb	%k3, %r10d
	kmovb	%k4, %r14d
	kmovb	%k5, %r15d

	clc
	rcl	$1, %al
	rcl	$1, %bl
	rcl	$1, %cl
	rcl	$1, %r11b
	rcl	$1, %r12b

	add	%r8b, %al
	adc	%r9b, %bl
	adc	%r10b, %cl
	adc	%r14b, %r11b
	adc	%r15b, %r12b

	xor	%r8b, %al
	xor	%r9b, %bl
	xor	%r10b, %cl
	xor	%r14b, %r11b
	xor	%r15b, %r12b

	kmovb	%eax, %k1
	kmovb	%ebx, %k2
	kmovb	%ecx, %k3
	kmovb	%r11d, %k4
	kmovb	%r12d, %k5

	vpsubq	AND_MASK, ACC0, ACC0{%k1}
	vpsubq	AND_MASK, ACC1, ACC1{%k2}
	vpsubq	AND_MASK, ACC2, ACC2{%k3}
	vpsubq	AND_MASK, ACC3, ACC3{%k4}
	vpsubq	AND_MASK, ACC4, ACC4{%k5}

	vpandq	AND_MASK, ACC0, ACC0
	vpandq	AND_MASK, ACC1, ACC1
	vpandq	AND_MASK, ACC2, ACC2
	vpandq	AND_MASK, ACC3, ACC3
	vpandq	AND_MASK, ACC4, ACC4

	vmovdqu64	ACC0, 64*0(res)
	vmovdqu64	ACC1, 64*1(res)
	vmovdqu64	ACC2, 64*2(res)
	vmovdqu64	ACC3, 64*3(res)
	vmovdqu64	ACC4, 64*4(res)

	pop	%r15
	pop	%r14
	pop	%r13
	pop	%r12
	pop	%rbx
	ret
################################################################################
